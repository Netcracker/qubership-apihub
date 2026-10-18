CREATE TABLE t (
    id INT UNIQUE,
    code INT UNIQUE
);

CREATE TABLE u (
    ref INT,
    CONSTRAINT fk_u_t FOREIGN KEY (ref) REFERENCES t (id)
);
