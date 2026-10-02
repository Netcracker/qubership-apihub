CREATE TABLE legacy (
    id INT PRIMARY KEY
);

CREATE TABLE target (
    id INT PRIMARY KEY
);

CREATE TABLE u (
    ref INT,
    CONSTRAINT fk_u_ref FOREIGN KEY (ref) REFERENCES legacy (id)
);
