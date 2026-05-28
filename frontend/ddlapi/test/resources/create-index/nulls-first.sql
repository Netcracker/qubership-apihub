CREATE TABLE metrics (id bigint PRIMARY KEY, x numeric);

CREATE INDEX idx_metrics_x_nulls_first ON metrics (x ASC NULLS FIRST);
