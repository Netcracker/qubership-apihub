CREATE TABLE refs (
  id bigint PRIMARY KEY
);

CREATE TABLE dependent (
  id bigint PRIMARY KEY,
  ref_id bigint,
  ref_id2 bigint,
  FOREIGN KEY (ref_id) REFERENCES refs (id) ON UPDATE SET DEFAULT,
  FOREIGN KEY (ref_id2) REFERENCES refs (id) ON DELETE SET NULL (ref_id2)
);
