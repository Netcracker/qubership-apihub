CREATE TABLE notifications (id bigint PRIMARY KEY, data jsonb, delivered boolean DEFAULT false);

CREATE INDEX idx_pending_notifications ON notifications USING gin (data) WHERE delivered = false;
