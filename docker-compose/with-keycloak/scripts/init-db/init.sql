CREATE USER keycloak WITH PASSWORD 'keycloak' CREATEDB INHERIT;
CREATE DATABASE keycloak OWNER keycloak;
GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;

CREATE USER apihub_backend_user WITH PASSWORD 'apihub_backend_password' CREATEDB INHERIT;
CREATE DATABASE apihub_backend OWNER apihub_backend_user;
GRANT ALL PRIVILEGES ON DATABASE apihub_backend TO apihub_backend_user;

CREATE USER api_linter_user WITH PASSWORD 'api_linter_password' CREATEDB INHERIT;
CREATE DATABASE api_linter OWNER api_linter_user;
GRANT ALL PRIVILEGES ON DATABASE api_linter TO api_linter_user;

CREATE USER agents_backend_user WITH PASSWORD 'agents_backend_password' CREATEDB INHERIT;
CREATE DATABASE agents_backend OWNER agents_backend_user;
GRANT ALL PRIVILEGES ON DATABASE agents_backend TO agents_backend_user;
