CREATE TABLE external_identity
(
    provider    varchar NOT NULL,
    external_id varchar NOT NULL,
    internal_id varchar NOT NULL,
    PRIMARY KEY(provider, external_id)
);

ALTER TABLE user_data 
ADD COLUMN password bytea;

ALTER TABLE external_identity ADD CONSTRAINT "FK_user_data"
    FOREIGN KEY (internal_id) REFERENCES user_data (user_id) ON DELETE Cascade ON UPDATE Cascade;

update user_data set email = LOWER(email);

delete from user_data 
where email in (
    select email from user_data
    group by email having count(email) > 1);

ALTER TABLE user_data
ADD CONSTRAINT email_unique UNIQUE (email);