CREATE TABLE collated_texts (
  id bigint PRIMARY KEY,
  name text COLLATE "en-US-x-icu",
  code text COLLATE "C"
);
