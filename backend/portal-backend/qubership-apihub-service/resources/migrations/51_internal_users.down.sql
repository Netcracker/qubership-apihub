DROP TABLE IF EXISTS external_identity;
ALTER TABLE user_data DROP COLUMN password;
ALTER TABLE user_data DROP CONSTRAINT email_unique;