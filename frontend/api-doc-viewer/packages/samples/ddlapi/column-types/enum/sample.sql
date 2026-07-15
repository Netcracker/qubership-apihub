CREATE TYPE mood AS ENUM ('happy', 'sad');

CREATE TABLE t (
  c mood
);
