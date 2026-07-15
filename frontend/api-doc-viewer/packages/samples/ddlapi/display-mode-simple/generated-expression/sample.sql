CREATE TABLE t (
  label text GENERATED ALWAYS AS (upper(status)) STORED,
  status text NOT NULL DEFAULT 'draft'
);
