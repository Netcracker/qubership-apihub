CREATE TABLE registrations (
  id bigint PRIMARY KEY,
  email text,
  phone text,
  UNIQUE NULLS NOT DISTINCT (email, phone)
);
