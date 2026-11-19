-- ====================================================================
-- Rollback Migration: 06-add-device-tokens-rollback.sql
-- Mục đích: Hoàn tác migration 06-add-device-tokens.sql khi cần rollback
-- hạ tầng push notification về trạng thái trước đó.
-- ====================================================================

BEGIN;

DROP INDEX IF EXISTS idx_device_tokens_token;
DROP INDEX IF EXISTS idx_device_tokens_user_active;
DROP TABLE IF EXISTS device_tokens CASCADE;

COMMIT;
