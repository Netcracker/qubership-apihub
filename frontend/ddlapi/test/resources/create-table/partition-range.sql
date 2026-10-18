CREATE TABLE measurements (
  id bigint NOT NULL,
  logdate date NOT NULL,
  reading numeric(10, 2)
) PARTITION BY RANGE (logdate);
