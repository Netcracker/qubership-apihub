CREATE TABLE documents (
  id bigint PRIMARY KEY,
  content text NOT NULL,
  content_tsv tsvector,
  query tsquery
);
