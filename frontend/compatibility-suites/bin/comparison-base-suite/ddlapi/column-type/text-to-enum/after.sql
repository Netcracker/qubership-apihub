CREATE TYPE status AS ENUM ('NEW', 'DONE');

CREATE TABLE t (
    v status
);
