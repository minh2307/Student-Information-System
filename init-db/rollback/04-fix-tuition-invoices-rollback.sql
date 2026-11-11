-- ====================================================================
-- Rollback Script: 04-fix-tuition-invoices-rollback.sql
-- Mục đích: Khôi phục lại các bản ghi đã dọn dẹp từ bảng archive nếu cần.
-- Nguyên tắc kiểm toán (TASK-FEE-02):
-- 1. Idempotent: Chạy nhiều lần không gây conflict khóa chính.
-- 2. Transaction Block (BEGIN ... COMMIT) bảo đảm tính toàn vẹn.
-- 3. Đồng bộ hóa sequence tuition_fees_id_seq sau khi nạp lại id tường minh.
-- ====================================================================

BEGIN;

INSERT INTO tuition_fees (
    id, student_id, semester_name, total_credits, credit_unit_price, facility_fee,
    total_amount, paid_amount, status, due_date, payment_date, transaction_code,
    payment_method, payos_order_code, created_at
)
SELECT
    id, student_id, semester_name, total_credits, credit_unit_price, facility_fee,
    total_amount, paid_amount, status, due_date, payment_date, transaction_code,
    payment_method, payos_order_code, created_at
FROM tuition_fees_archive
ON CONFLICT (student_id, semester_name) DO UPDATE SET
    total_credits = EXCLUDED.total_credits,
    status = EXCLUDED.status,
    total_amount = EXCLUDED.total_amount,
    paid_amount = EXCLUDED.paid_amount,
    transaction_code = EXCLUDED.transaction_code,
    payos_order_code = EXCLUDED.payos_order_code;

-- Đồng bộ lại sequence auto-increment sau khi phục hồi
SELECT setval('tuition_fees_id_seq', COALESCE((SELECT MAX(id) FROM tuition_fees), 1));

COMMIT;
