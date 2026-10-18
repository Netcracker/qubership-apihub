CREATE TABLE hourly_stats (
  id bigint NOT NULL,
  ts timestamp NOT NULL,
  value numeric(10, 2)
) PARTITION BY RANGE (date_trunc('hour', ts));
