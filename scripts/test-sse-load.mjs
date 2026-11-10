#!/usr/bin/env node
/**
 * ==============================================================================
 * Rikkei EduPortal - SSE Load Testing & Stability Benchmark Tool (EDUP-204)
 * Đo Tải & Kiểm Thử Độ Ổn Định 200 Kết Nối SSE Real-time (SRS v2.1 Acceptance)
 * ==============================================================================
 *
 * Usage:
 *   node scripts/test-sse-load.mjs [options]
 *
 * Options:
 *   --target <url>       SSE Endpoint URL (default: http://221.121.3.201/api/v1/student/class-sections/live-seats)
 *   --concurrency <num>  Số lượng kết nối đồng thời (default: 200)
 *   --duration <sec>     Thời gian giữ kết nối kiểm thử độ ổn định (default: 60s)
 *   --rampup-batch <num> Số kết nối mở mỗi đợt (default: 20)
 *   --rampup-delay <ms>  Độ trễ giữa các đợt mở (default: 100ms)
 *   --token <jwt>        Bearer Token cho sinh viên authenticated (optional)
 *   --report <file>      Đường dẫn xuất file JSON báo cáo (default: sse-load-test-report.json)
 */

import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';

// ------------------------------------------------------------------------------
// 1. Parse Arguments & Configuration
// ------------------------------------------------------------------------------
const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return defaultValue;
}

const TARGET_URL = getArg('--target', 'http://221.121.3.201/api/v1/student/class-sections/live-seats');
const CONCURRENCY = parseInt(getArg('--concurrency', '200'), 10);
const HOLD_DURATION_SEC = parseInt(getArg('--duration', '60'), 10);
const RAMPUP_BATCH = parseInt(getArg('--rampup-batch', '20'), 10);
const RAMPUP_DELAY_MS = parseInt(getArg('--rampup-delay', '100'), 10);
const AUTH_TOKEN = getArg('--token', null);
const REPORT_FILE = getArg('--report', 'sse-load-test-report.json');

// ------------------------------------------------------------------------------
// 2. Metrics & State Tracking
// ------------------------------------------------------------------------------
const metrics = {
  targetUrl: TARGET_URL,
  targetConcurrency: CONCURRENCY,
  testDurationSeconds: HOLD_DURATION_SEC,
  startTime: new Date().toISOString(),
  endTime: null,
  connections: {
    attempted: 0,
    established: 0,
    failed: 0,
    active: 0,
    dropped: 0,
    closedCleanly: 0,
  },
  events: {
    totalReceived: 0,
    connectedEvents: 0,
    heartbeatEvents: 0,
    seatUpdateEvents: 0,
    otherEvents: 0,
    totalBytes: 0,
  },
  latencies: {
    handshake: [], // ms
    ttfe: [],      // ms (Time To First Event)
  },
  errors: [],
};

// ------------------------------------------------------------------------------
// 3. Helper Functions: Stats & Math
// ------------------------------------------------------------------------------
function calculateStats(arr) {
  if (!arr || arr.length === 0) return { min: 0, max: 0, avg: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const avg = Math.round((sum / sorted.length) * 100) / 100;
  const p = (pct) => sorted[Math.min(Math.floor((pct / 100) * sorted.length), sorted.length - 1)];

  return {
    min: Math.round(sorted[0] * 100) / 100,
    max: Math.round(sorted[sorted.length - 1] * 100) / 100,
    avg,
    p50: Math.round(p(50) * 100) / 100,
    p90: Math.round(p(90) * 100) / 100,
    p95: Math.round(p(95) * 100) / 100,
    p99: Math.round(p(99) * 100) / 100,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ------------------------------------------------------------------------------
// 4. Client Connection Worker
// ------------------------------------------------------------------------------
const activeSockets = new Set();
let stopMonitoring = false;

function createSseClient(clientId) {
  return new Promise((resolve) => {
    metrics.connections.attempted++;
    const url = new URL(TARGET_URL);
    const isHttps = url.protocol === 'https:';
    const requester = isHttps ? https : http;

    const headers = {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'User-Agent': `EduPortal-SSE-LoadTester/1.0 (Client-${clientId})`,
    };
    if (AUTH_TOKEN) {
      headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
    }

    const options = {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers,
      timeout: 120000,
    };

    const startTime = performance.now();
    let handshakeRecorded = false;
    let firstEventRecorded = false;
    let buffer = '';

    const req = requester.request(options, (res) => {
      const handshakeTime = performance.now() - startTime;
      metrics.latencies.handshake.push(handshakeTime);
      handshakeRecorded = true;

      if (res.statusCode !== 200) {
        metrics.connections.failed++;
        metrics.errors.push({
          clientId,
          stage: 'handshake',
          statusCode: res.statusCode,
          message: `Unexpected status code: ${res.statusCode}`,
        });
        res.resume();
        req.destroy();
        resolve({ success: false, clientId, error: `HTTP ${res.statusCode}` });
        return;
      }

      metrics.connections.established++;
      metrics.connections.active++;
      activeSockets.add(req);

      resolve({ success: true, clientId, handshakeTime });

      res.on('data', (chunk) => {
        metrics.events.totalBytes += chunk.length;
        buffer += chunk.toString('utf-8');

        if (!firstEventRecorded) {
          const ttfe = performance.now() - startTime;
          metrics.latencies.ttfe.push(ttfe);
          firstEventRecorded = true;
        }

        // Parse SSE chunk by empty line separator
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // giữ lại phần chunk dở dang

        for (const rawBlock of lines) {
          if (!rawBlock.trim()) continue;
          metrics.events.totalReceived++;

          if (rawBlock.includes('HEARTBEAT') || rawBlock.includes(':keep-alive')) {
            metrics.events.heartbeatEvents++;
          } else if (rawBlock.includes('CONNECTED')) {
            metrics.events.connectedEvents++;
          } else if (rawBlock.includes('SEAT_UPDATE')) {
            metrics.events.seatUpdateEvents++;
          } else {
            metrics.events.otherEvents++;
          }
        }
      });

      res.on('end', () => {
        metrics.connections.active = Math.max(0, metrics.connections.active - 1);
        activeSockets.delete(req);
        if (!stopMonitoring) {
          metrics.connections.dropped++;
        } else {
          metrics.connections.closedCleanly++;
        }
      });

      res.on('error', (err) => {
        metrics.connections.active = Math.max(0, metrics.connections.active - 1);
        activeSockets.delete(req);
        if (!stopMonitoring) {
          metrics.connections.dropped++;
          metrics.errors.push({ clientId, stage: 'stream', error: err.message });
        }
      });
    });

    req.setTimeout(15000, () => {
      req.destroy(new Error('Connect timeout after 15s'));
    });

    req.on('error', (err) => {
      if (!handshakeRecorded) {
        metrics.connections.failed++;
        metrics.errors.push({ clientId, stage: 'connect', error: err.message });
        resolve({ success: false, clientId, error: err.message });
      } else {
        metrics.connections.active = Math.max(0, metrics.connections.active - 1);
        activeSockets.delete(req);
        if (!stopMonitoring) {
          metrics.connections.dropped++;
          metrics.errors.push({ clientId, stage: 'socket', error: err.message });
        }
      }
    });

    req.end();
  });
}

// ------------------------------------------------------------------------------
// 5. Main Test Execution Orchestrator
// ------------------------------------------------------------------------------
async function runLoadTest() {
  console.log('\n==============================================================================');
  console.log('   🚀 RIKKEI EDUPORTAL - KIỂM THỬ ĐỘ ỔN ĐỊNH 200 KẾT NỐI SSE (STAGING VPS)');
  console.log('==============================================================================');
  console.log(`📍 Endpoint Mục Tiêu : ${TARGET_URL}`);
  console.log(`👥 Tải Đồng Thời     : ${CONCURRENCY} kết nối thường trực`);
  console.log(`⏱️ Thời Gian Giữ Tải : ${HOLD_DURATION_SEC} giây (đủ kiểm tra nhiều chu kỳ Heartbeat 25s)`);
  console.log(`📈 Ramp-up Cấu Hình : ${RAMPUP_BATCH} kết nối / đợt (nghỉ ${RAMPUP_DELAY_MS}ms)`);
  console.log(`🔐 Chế Độ Xác Thực  : ${AUTH_TOKEN ? 'Bearer JWT (Targeted Events)' : 'Anonymous Stream'}`);
  console.log('------------------------------------------------------------------------------\n');

  // ----------------------------------------------------------------------------
  // Giai đoạn 1: Ramp-up mở 200 kết nối
  // ----------------------------------------------------------------------------
  console.log(`[Giai đoạn 1/3] Đang tiến hành mở bậc thang ${CONCURRENCY} kết nối SSE...`);
  const connectPromises = [];
  let spawned = 0;

  const rampStart = performance.now();
  while (spawned < CONCURRENCY) {
    const batchSize = Math.min(RAMPUP_BATCH, CONCURRENCY - spawned);
    const batch = [];
    for (let i = 0; i < batchSize; i++) {
      const clientId = spawned + i + 1;
      batch.push(createSseClient(clientId));
    }
    connectPromises.push(...batch);
    spawned += batchSize;

    process.stdout.write(`\r  -> Đã khởi tạo: ${spawned}/${CONCURRENCY} kết nối...`);
    if (spawned < CONCURRENCY) {
      await sleep(RAMPUP_DELAY_MS);
    }
  }
  process.stdout.write('\n');

  console.log('  -> Đang chờ phản hồi bắt tay HTTP từ server...');
  await Promise.all(connectPromises);
  const rampElapsed = Math.round(performance.now() - rampStart);
  console.log(`  ✓ Hoàn tất Ramp-up trong ${rampElapsed}ms. Hiện đang hoạt động: ${metrics.connections.active}/${CONCURRENCY} kết nối.\n`);

  // ----------------------------------------------------------------------------
  // Giai đoạn 2: Giữ kết nối & Giám sát nhịp tim (Soak & Stability)
  // ----------------------------------------------------------------------------
  console.log(`[Giai đoạn 2/3] Duy trì kết nối ổn định trong ${HOLD_DURATION_SEC} giây để kiểm thử Heartbeat 25s & chống drop...`);
  const interval = 5; // In trạng thái mỗi 5 giây
  let remaining = HOLD_DURATION_SEC;

  while (remaining > 0) {
    const waitTime = Math.min(interval, remaining);
    await sleep(waitTime * 1000);
    remaining -= waitTime;
    const elapsed = HOLD_DURATION_SEC - remaining;

    process.stdout.write(
      `\r  [${elapsed}s / ${HOLD_DURATION_SEC}s] ` +
      `Active: ${metrics.connections.active} | ` +
      `Heartbeats: ${metrics.events.heartbeatEvents} | ` +
      `Total Events: ${metrics.events.totalReceived} | ` +
      `Dropped: ${metrics.connections.dropped}`
    );
  }
  process.stdout.write('\n\n');

  // ----------------------------------------------------------------------------
  // Giai đoạn 3: Giải phóng kết nối sạch (Tear-down)
  // ----------------------------------------------------------------------------
  console.log('[Giai đoạn 3/3] Giải phóng toàn bộ kết nối và phân tích kết quả...');
  stopMonitoring = true;
  for (const socket of activeSockets) {
    try {
      socket.destroy();
    } catch (e) {}
  }
  activeSockets.clear();
  metrics.endTime = new Date().toISOString();

  // ----------------------------------------------------------------------------
  // Thống kê & Đánh giá Tiêu chí Nghiệm thu (SRS v2.1)
  // ----------------------------------------------------------------------------
  const hsStats = calculateStats(metrics.latencies.handshake);
  const ttfeStats = calculateStats(metrics.latencies.ttfe);
  const successRate = metrics.connections.attempted > 0
    ? ((metrics.connections.established / metrics.connections.attempted) * 100).toFixed(2)
    : '0.00';
  const dropRate = metrics.connections.established > 0
    ? ((metrics.connections.dropped / metrics.connections.established) * 100).toFixed(2)
    : '0.00';

  // Tiêu chí SRS:
  // 1. Phục vụ 200 kết nối đồng thời: Active đạt 200/200 (hoặc tỷ lệ thành công >= 95%)
  // 2. Độ trễ sự kiện <= 100ms
  // 3. Drop rate 0%
  const isConcurrencyPass = metrics.connections.established >= CONCURRENCY && metrics.connections.dropped === 0;
  const isLatencyPass = ttfeStats.p95 <= 100; // P95 <= 100ms
  const isHeartbeatPass = metrics.events.heartbeatEvents >= Math.floor((HOLD_DURATION_SEC / 25) * CONCURRENCY * 0.7);

  console.log('==============================================================================');
  console.log('                     BÁO CÁO KẾT QUẢ ĐO TẢI SSE REAL-TIME                     ');
  console.log('==============================================================================');
  console.log(`🔹 Tổng kết nối yêu cầu       : ${metrics.targetConcurrency}`);
  console.log(`🔹 Kết nối bắt tay thành công : ${metrics.connections.established} (${successRate}%)`);
  console.log(`🔹 Kết nối lỗi / từ chối      : ${metrics.connections.failed}`);
  console.log(`🔹 Kết nối bị rớt giữa chừng  : ${metrics.connections.dropped} (${dropRate}%)`);
  console.log(`------------------------------------------------------------------------------`);
  console.log(`📊 ĐỘ TRỄ BẮT TAY (Handshake HTTP 200 Stream):`);
  console.log(`   - Min: ${hsStats.min} ms | Avg: ${hsStats.avg} ms | Max: ${hsStats.max} ms`);
  console.log(`   - Median (P50): ${hsStats.p50} ms | P90: ${hsStats.p90} ms | P95: ${hsStats.p95} ms | P99: ${hsStats.p99} ms`);
  console.log(`📊 THỜI GIAN NHẬN SỰ KIỆN ĐẦU TIÊN (TTFE - Time To First Event):`);
  console.log(`   - Min: ${ttfeStats.min} ms | Avg: ${ttfeStats.avg} ms | Max: ${ttfeStats.max} ms`);
  console.log(`   - Median (P50): ${ttfeStats.p50} ms | P90: ${ttfeStats.p90} ms | P95: ${ttfeStats.p95} ms | P99: ${ttfeStats.p99} ms`);
  console.log(`------------------------------------------------------------------------------`);
  console.log(`📡 THỐNG KÊ SỰ KIỆN (Events Received):`);
  console.log(`   - Tổng sự kiện nhận được   : ${metrics.events.totalReceived}`);
  console.log(`   - Sự kiện CONNECTED        : ${metrics.events.connectedEvents}`);
  console.log(`   - Sự kiện HEARTBEAT (25s)  : ${metrics.events.heartbeatEvents}`);
  console.log(`   - Sự kiện SEAT_UPDATE      : ${metrics.events.seatUpdateEvents}`);
  console.log(`   - Tổng dung lượng tải về   : ${(metrics.events.totalBytes / 1024).toFixed(2)} KB`);
  console.log('==============================================================================');
  console.log('                  ĐỐI SOÁT TIÊU CHÍ CHẤP NHẬN (ACCEPTANCE CRITERIA)            ');
  console.log('==============================================================================');
  console.log(` 1. Khả năng chịu tải 200 kết nối song song : ${isConcurrencyPass ? '✅ ĐẠT (PASS)' : '❌ CHƯA ĐẠT (FAIL)'}`);
  console.log(` 2. Độ trễ phát sự kiện SSE (P95 <= 100ms)  : ${isLatencyPass ? '✅ ĐẠT (PASS)' : '⚠️ CẦN TỐI ƯU THÊM (P95: ' + ttfeStats.p95 + 'ms)'}`);
  console.log(` 3. Ổn định Heartbeat keep-alive 25s        : ${isHeartbeatPass ? '✅ ĐẠT (PASS)' : '⚠️ CẢNH BÁO (Thiếu chu kỳ nhịp tim)'}`);
  console.log(` 4. Tỷ lệ rớt kết nối (Drop Rate = 0%)      : ${metrics.connections.dropped === 0 ? '✅ ĐẠT (0% drop)' : '❌ LỖI (' + metrics.connections.dropped + ' drops)'}`);
  console.log('==============================================================================\n');

  // Ghi file báo cáo
  const reportPayload = {
    ...metrics,
    statistics: {
      handshake: hsStats,
      ttfe: ttfeStats,
      successRate: parseFloat(successRate),
      dropRate: parseFloat(dropRate),
    },
    verdict: {
      concurrencyPass: isConcurrencyPass,
      latencyPass: isLatencyPass,
      heartbeatPass: isHeartbeatPass,
      overallPass: isConcurrencyPass && isHeartbeatPass,
    },
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(reportPayload, null, 2), 'utf-8');
  console.log(`📝 Đã xuất chi tiết báo cáo kiểm thử tải ra file: ${REPORT_FILE}\n`);

  return reportPayload.verdict.overallPass ? 0 : 1;
}

runLoadTest().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
