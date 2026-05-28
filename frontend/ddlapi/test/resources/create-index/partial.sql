CREATE TABLE tasks (id bigint PRIMARY KEY, status text, assigned_to bigint);

CREATE INDEX idx_active_tasks ON tasks (assigned_to) WHERE status = 'active';
