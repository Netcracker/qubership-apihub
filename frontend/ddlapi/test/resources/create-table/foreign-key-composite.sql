CREATE TABLE parent (
  a bigint,
  b bigint,
  PRIMARY KEY (a, b)
);

CREATE TABLE child (
  id bigint PRIMARY KEY,
  a bigint,
  b bigint,
  FOREIGN KEY (a, b) REFERENCES parent (a, b) DEFERRABLE INITIALLY DEFERRED
);
