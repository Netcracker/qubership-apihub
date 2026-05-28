CREATE TABLE persons (
  id bigint PRIMARY KEY,
  age integer CHECK (age >= 0)
);
