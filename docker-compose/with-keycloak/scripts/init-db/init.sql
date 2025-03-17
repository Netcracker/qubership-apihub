CREATE USER apihub_backend_user WITH PASSWORD 'apihub_backend_password' CREATEDB INHERIT;
CREATE DATABASE apihub_backend OWNER apihub_backend_user;
GRANT ALL PRIVILEGES ON DATABASE apihub_backend TO apihub_backend_user;

CREATE USER keycloak WITH PASSWORD 'keycloak' CREATEDB INHERIT;
CREATE DATABASE keycloak OWNER keycloak;
GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;