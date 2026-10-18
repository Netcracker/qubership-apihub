CREATE TABLE regional_sales (
  id bigint NOT NULL,
  region text NOT NULL,
  amount numeric(12, 2)
) PARTITION BY LIST (region);
