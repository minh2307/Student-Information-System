import React, { useState, useEffect, useRef } from 'react'
import { QrCode, Play, StopCircle, RefreshCw, Users, CheckCircle, Clock, ShieldCheck, X, Maximize2, Minimize2, AlertTriangle } from 'lucide-react'
import api from '../../../services/api'

export function QrAttendanceModal({ sectionId, sectionCode, courseName, onClose }) {
  const [session, setSession] = useState(null)
  const [qrData, setQrData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [closing, setClosing] = useState(false)
  const [countdown, setCountdown] = useState(15)
  const [error, setError] = useState(null)
  const [projectorMode, setProjectorMode] = useState(false)
  const [qrRefreshing, setQrRefreshing] = useState(false)

  const pollingRef = useRef(null)
  const timerRef = useRef(null)
  const prevWindowRef = useRef(null)

  const fetchCurrentSession = async () => {
    try {
      const res = await api.get(`/lecturer/classes/${sectionId}/attendance/session`)
      if (res.data?.data) {
        setSession(res.data.data)
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error('Lỗi tải phiên điểm danh:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchRotatingQr = async () => {
    try {
      const res = await api.get(`/lecturer/classes/${sectionId}/attendance/qr-code`)
      if (res.data?.data) {
        const data = res.data.data
        // Detect window change for flash animation
        if (prevWindowRef.current !== null && prevWindowRef.current !== data.expiresAtEpochMs) {
          setQrRefreshing(true)
          setTimeout(() => setQrRefreshing(false), 400)
        }
        prevWindowRef.current = data.expiresAtEpochMs
        setQrData(data)
        setCountdown(data.remainingSeconds || 15)
      }
    } catch (err) {
      console.warn('Lỗi lấy QR xoay vòng:', err)
    }
  }

  const handleStartSession = async () => {
    try {
      setStarting(true)
      setError(null)
      const res = await api.post(`/lecturer/classes/${sectionId}/attendance/session`, {
        sessionName: `Điểm danh ${new Date().toLocaleDateString('vi-VN')}`
      })
      if (res.data?.data) {
        setSession(res.data.data)
        await fetchRotatingQr()
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể bắt đầu phiên điểm danh.')
    } finally {
      setStarting(false)
    }
  }

  const handleCloseSession = async () => {
    try {
      setClosing(true)
      const res = await api.post(`/lecturer/classes/${sectionId}/attendance/close-session`)
      if (res.data?.data) {
        setSession(res.data.data)
        setQrData(null)
        setProjectorMode(false)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể đóng phiên điểm danh.')
    } finally {
      setClosing(false)
    }
  }

  useEffect(() => {
    fetchCurrentSession()
  }, [sectionId])

  useEffect(() => {
    if (session?.status === 'OPEN') {
      fetchRotatingQr()
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            fetchRotatingQr()
            return 15
          }
          return prev - 1
        })
      }, 1000)
      pollingRef.current = setInterval(() => {
        fetchCurrentSession()
      }, 4000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [session?.status])

  // Countdown ring calculation
  const circumference = 2 * Math.PI * 22
  const strokeDashoffset = circumference * (1 - countdown / 15)
  const isWarning = countdown <= 4
  const ringColor = isWarning ? '#ef4444' : '#6366f1'

  // ─── Projector Mode (Fullscreen) ─────────────────────────────
  if (projectorMode && qrData) {
    return (
      <div className="fixed inset-0 z-[60] bg-white flex flex-col items-center justify-center select-none">
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-4 bg-indigo-700 text-white">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-indigo-200" />
            <div>
              <div className="font-bold text-lg leading-tight">{sectionCode} — {courseName}</div>
              <div className="text-indigo-200 text-sm">{session?.sessionName}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-indigo-600 px-3 py-1.5 rounded-xl">
              <Users className="h-4 w-4" />
              <span className="font-bold text-sm">{session?.totalAttendees || 0} SV đã điểm danh</span>
            </div>
            <button
              onClick={() => setProjectorMode(false)}
              className="p-2 rounded-xl hover:bg-indigo-600 transition"
              title="Thoát chế độ chiếu"
            >
              <Minimize2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Main QR area */}
        <div className="flex flex-col items-center gap-6 mt-16">
          {/* Anti-proxy warning banner */}
          <div className="flex items-center gap-2 px-5 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            Mã QR xoay vòng mỗi 15 giây — Chụp màn hình chia sẻ sẽ không hợp lệ
          </div>

          {/* QR Image */}
          <div className={`relative transition-all duration-300 ${qrRefreshing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
            <div className="p-5 bg-white rounded-3xl shadow-2xl border-4 border-indigo-100">
              {qrData.qrImageBase64 ? (
                <img
                  src={qrData.qrImageBase64}
                  alt="QR Code điểm danh"
                  className="w-72 h-72 rounded-xl"
                  draggable={false}
                />
              ) : (
                <div className="w-72 h-72 flex items-center justify-center bg-slate-100 rounded-xl text-slate-400 text-sm">
                  Đang tạo mã QR...
                </div>
              )}
            </div>
          </div>

          {/* Countdown ring */}
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center w-16 h-16">
              <svg className="absolute" width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="#e2e8f0" strokeWidth="4"/>
                <circle
                  cx="28" cy="28" r="22" fill="none"
                  stroke={ringColor}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
                />
              </svg>
              <span className={`relative text-xl font-black tabular-nums ${isWarning ? 'text-red-500' : 'text-indigo-700'}`}>
                {countdown}
              </span>
            </div>
            <div className="text-slate-600 text-sm">
              <div className="font-semibold">Mã mới sau <span className={`font-black text-lg ${isWarning ? 'text-red-500' : 'text-indigo-700'}`}>{countdown}s</span></div>
              <div className="text-xs text-slate-400">HMAC-SHA256 · Anti-Proxy · 15s window</div>
            </div>
          </div>

          <p className="text-slate-400 text-xs mt-2">
            📱 Sinh viên mở portal → Thời khóa biểu → Nút "Quét QR Điểm Danh"
          </p>
        </div>
      </div>
    )
  }

  // ─── Normal Modal ────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Điểm Danh QR Động (Anti-Proxy)
                {session?.status === 'OPEN' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Đang mở
                  </span>
                )}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{sectionCode} · {courseName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto mt-4">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Đang tải phiên điểm danh...</p>
            </div>
          ) : session?.status === 'OPEN' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* QR Code Panel */}
              <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-5">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <ShieldCheck className="h-4 w-4 text-indigo-500" />
                    Mã QR Bảo Mật
                  </div>
                  <button
                    onClick={() => setProjectorMode(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 transition"
                    title="Mở chế độ máy chiếu"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    Chiếu lên màn hình
                  </button>
                </div>

                {/* QR Image */}
                <div className={`transition-all duration-300 ${qrRefreshing ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}`}>
                  {qrData?.qrImageBase64 ? (
                    <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-100">
                      <img
                        src={qrData.qrImageBase64}
                        alt="QR Code điểm danh"
                        className="w-48 h-48 rounded-lg"
                        draggable={false}
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-48 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                  )}
                </div>

                {/* Countdown ring */}
                <div className="flex flex-col items-center gap-1">
                  <div className="relative flex items-center justify-center w-14 h-14">
                    <svg className="absolute" width="52" height="52" viewBox="0 0 52 52">
                      <circle cx="26" cy="26" r="22" fill="none" stroke="#e2e8f0" strokeWidth="4"/>
                      <circle
                        cx="26" cy="26" r="22" fill="none"
                        stroke={ringColor}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
                      />
                    </svg>
                    <span className={`relative text-lg font-black tabular-nums ${isWarning ? 'text-red-500' : 'text-indigo-600'}`}>
                      {countdown}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isWarning ? '⚠ Sắp đổi mã!' : `Đổi mã sau ${countdown}s`}
                  </p>
                </div>

                {/* Anti-proxy badge */}
                <div className="w-full flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                    Mã hết hạn sau mỗi 15s · Chụp ảnh gửi nhóm sẽ bị từ chối
                  </p>
                </div>

                {/* Close Session button */}
                <button
                  onClick={handleCloseSession}
                  disabled={closing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-950/30 transition disabled:opacity-50"
                >
                  <StopCircle className="h-4 w-4" />
                  {closing ? 'Đang đóng...' : 'Kết thúc phiên điểm danh'}
                </button>
              </div>

              {/* Live Attendee List */}
              <div className="flex flex-col h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-600" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Sinh viên đã điểm danh ({session.records?.length || 0})
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Cập nhật tự động
                  </span>
                </div>

                <div className="mt-3 flex-1 overflow-y-auto max-h-72 space-y-2 pr-1">
                  {session.records && session.records.length > 0 ? (
                    session.records.map((r) => (
                      <div
                        key={r.recordId}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                      >
                        <div>
                          <div className="font-semibold text-sm text-slate-900 dark:text-white">
                            {r.studentName}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            MSSV: {r.studentCode}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded">
                          <CheckCircle className="h-3 w-3" />
                          {r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Vừa xong'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-sm text-slate-400">
                      Chưa có sinh viên nào quét mã điểm danh...
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Idle / Closed state */
            <div className="text-center py-10 px-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm">
                <QrCode className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Bắt đầu phiên điểm danh QR động
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Hệ thống sẽ tạo mã QR bảo mật xoay vòng 15 giây/lần. Sinh viên quét mã trực tiếp trên màn chiếu để điểm danh. Chống gian lận và chụp ảnh gửi nhóm hoàn toàn.
              </p>

              {session && (
                <div className="mt-4 p-3 inline-block rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
                  Phiên gần nhất: <span className="font-semibold">{session.sessionName}</span> • Số SV đã điểm danh: <span className="font-semibold">{session.totalAttendees || 0}</span>
                </div>
              )}

              {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleStartSession}
                  disabled={starting}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Play className="h-5 w-5 fill-current" />
                  {starting ? 'Đang khởi tạo...' : 'Mở phiên điểm danh QR ngay'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
