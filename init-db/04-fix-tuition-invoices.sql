-- ====================================================================
-- Migration: 04-fix-tuition-invoices.sql
-- Mục đích: Dọn dẹp an toàn các bản ghi học phí ảo được sinh tự động
-- cho các học kỳ mà sinh viên chưa đăng ký học phần nào.
-- Nguyên tắc kiểm toán (TASK-FEE-02):
-- 1. Idempotent: Chạy nhiều lần không sinh lỗi, không nhân bản dữ liệu.
-- 2. Bảo toàn 100% dữ liệu lịch sử thanh toán (paid_amount > 0 hoặc có transaction_code).
-- 3. Bọc trong Transaction Block (BEGIN ... COMMIT) đảm bảo tính toàn vẹn (ACID).
-- 4. Sao lưu toàn bộ bản ghi trước khi dọn vào tuition_fees_archive.
-- 5. Nâng cấp transaction_code lên VARCHAR(255) để lưu vết đầy đủ mọi đợt thanh toán.
-- ====================================================================

BEGIN;

-- 1. Bảng lưu trữ an toàn các bản ghi học phí trước khi điều chỉnh
CREATE TABLE IF NOT EXISTS tuition_fees_archive (
    id BIGINT PRIMARY KEY,
    student_id BIGINT,
    semester_name VARCHAR(30),
    total_credits INT,
    credit_unit_price NUMERIC(12,2),
    facility_fee NUMERIC(12,2),
    total_amount NUMERIC(12,2),
    paid_amount NUMERIC(12,2),
    status VARCHAR(20),
    due_date DATE,
    payment_date TIMESTAMP,
    transaction_code VARCHAR(255),
    payment_method VARCHAR(50),
    payos_order_code BIGINT,
    created_at TIMESTAMP,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archive_reason VARCHAR(255)
);

-- Mở rộng độ dài transaction_code nếu đang là VARCHAR(100) để lưu vết đa giao dịch
ALTER TABLE tuition_fees ALTER COLUMN transaction_code TYPE VARCHAR(255);
ALTER TABLE tuition_fees_archive ALTER COLUMN transaction_code TYPE VARCHAR(255);

-- 2. Sao lưu các bản ghi học phí phát sinh sai (0 tín chỉ, chưa thanh toán, không giao dịch)
INSERT INTO tuition_fees_archive (
    id, student_id, semester_name, total_credits, credit_unit_price, facility_fee,
    total_amount, paid_amount, status, due_date, payment_date, transaction_code,
    payment_method, payos_order_code, created_at, archive_reason
)
SELECT
    id, student_id, semester_name, total_credits, credit_unit_price, facility_fee,
    total_amount, paid_amount, status, due_date, payment_date, transaction_code,
    payment_method, payos_order_code, created_at,
    'Bản ghi học phí phát sinh tự động khi sinh viên chưa đăng ký học phần'
FROM tuition_fees
WHERE total_credits = 0
  AND (paid_amount IS NULL OR paid_amount = 0)
  AND transaction_code IS NULL
  AND payos_order_code IS NULL
ON CONFLICT (id) DO NOTHING;

-- 3. Dọn dẹp an toàn các bản ghi ảo khỏi bảng chính (KHÔNG xóa bất kỳ bản ghi nào đã thanh toán)
DELETE FROM tuition_fees
WHERE total_credits = 0
  AND (paid_amount IS NULL OR paid_amount = 0)
  AND transaction_code IS NULL
  AND payos_order_code IS NULL;

COMMIT;
