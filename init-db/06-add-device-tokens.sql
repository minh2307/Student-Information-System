-- ====================================================================
-- Migration: 06-add-device-tokens.sql
-- Mục đích: Bổ sung bảng device_tokens và các chỉ mục phục vụ phân hệ
-- Push Notification (Firebase Cloud Messaging) cho Android Mobile App.
-- 
-- Nguyên tắc kiểm toán & an toàn dữ liệu:
-- 1. Idempotent: Sử dụng CREATE TABLE IF NOT EXISTS & CREATE INDEX IF NOT EXISTS.
-- 2. An toàn với DB đã tồn tại: Chạy được trực tiếp trên môi trường Staging/Production
--    mà không cần xóa volume postgres_data hay khởi tạo lại database.
-- 3. Toàn vẹn tham chiếu (ACID): Bọc trong transaction block (BEGIN ... COMMIT).
-- 4. Ràng buộc toàn vẹn: Khóa ngoại users(id) ON DELETE CASCADE, token UNIQUE.
-- 5. Chỉ mục tối ưu: Phục vụ tra cứu token duy nhất và phát thông báo diện rộng.
-- ====================================================================

BEGIN;

-- 1. Tạo bảng device_tokens nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS device_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(512) NOT NULL,
    platform VARCHAR(32) NOT NULL DEFAULT 'ANDROID',
    device_id VARCHAR(128),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_device_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Đảm bảo ràng buộc UNIQUE trên cột token nếu bảng đã tồn tại từ trước mà chưa có ràng buộc
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_device_tokens_token' AND conrelid = 'device_tokens'::regclass
    ) THEN
        -- Kiểm tra nếu chưa có unique constraint trên token
        BEGIN
            ALTER TABLE device_tokens ADD CONSTRAINT uq_device_tokens_token UNIQUE (token);
        EXCEPTION
            WHEN duplicate_table OR duplicate_object THEN
                NULL; -- Đã tồn tại constraint tương đương
        END;
    END IF;
END $$;

-- 3. Tạo chỉ mục tối ưu hóa truy vấn
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_active ON device_tokens(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token);

COMMIT;
