CREATE TABLE events (
  id bigint NOT NULL,
  ts timestamp NOT NULL,
  kind text NOT NULL
) PARTITION BY RANGE (ts, kind);
