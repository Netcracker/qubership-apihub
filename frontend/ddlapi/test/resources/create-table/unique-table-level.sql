CREATE TABLE contacts (
  id bigint PRIMARY KEY,
  phone text NOT NULL,
  UNIQUE (phone)
);
