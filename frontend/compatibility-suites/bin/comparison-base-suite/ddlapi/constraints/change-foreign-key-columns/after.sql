CREATE TABLE parent (
    id INT PRIMARY KEY
);

CREATE TABLE child (
    a INT,
    b INT,
    CONSTRAINT fk_child_parent FOREIGN KEY (b) REFERENCES parent (id)
);
