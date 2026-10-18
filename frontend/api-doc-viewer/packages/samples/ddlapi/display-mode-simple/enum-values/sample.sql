CREATE TYPE mood AS ENUM ('happy', 'sad', 'neutral');

CREATE TABLE t (
  feeling mood NOT NULL DEFAULT 'neutral'
);
