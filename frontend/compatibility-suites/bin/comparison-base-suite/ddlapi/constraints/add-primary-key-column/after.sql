CREATE TABLE users (
    id INT,
    tenant_id INT,
    CONSTRAINT pk_users PRIMARY KEY(id, tenant_id)
);
