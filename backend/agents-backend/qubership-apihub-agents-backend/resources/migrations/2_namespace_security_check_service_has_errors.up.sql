ALTER TABLE namespace_security_check_service ADD COLUMN IF NOT EXISTS has_errors boolean NOT NULL DEFAULT false;
