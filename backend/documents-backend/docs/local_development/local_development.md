# Local development

## Prerequisites

- The Go version in [`backend/.go-version`](../../../.go-version)
- PostgreSQL 14+
- A running APIHUB backend (for token validation, api-key validation, package reads and the anonymous-access flag)

## Run

All commands run from `backend/documents-backend/`: `resources/migrations` and `config.yaml` are
resolved relative to the working directory (`BASE_PATH`, `DOCS_CONFIG_FOLDER`).

```bash
cd backend/documents-backend
DOCS_DATABASE_HOST=localhost DOCS_DATABASE_PORT=5433 DOCS_DATABASE_PASSWORD=documents \
DOCS_APIHUB_URL=http://localhost:8090 go run .
```

## Verify

```bash
go build ./... && go vet ./... && go test ./...
```

Handler tests run against in-memory repositories and a fake APIHUB (`internal/testsupport`); no database is needed.

The repository test in `repository/article_file_integration_test.go` runs only when a dedicated PostgreSQL test
database is configured; it recreates the schema from `resources/migrations/1_init.up.sql`:

```bash
DOCS_TEST_DB_HOST=localhost DOCS_TEST_DB_PORT=5433 DOCS_TEST_DB_NAME=documents_test \
DOCS_TEST_DB_USER=documents DOCS_TEST_DB_PASSWORD=documents go test ./repository/
```

## Full stack

The Compose stacks in [`deploy/docker-compose`](../../../../deploy/docker-compose) start PostgreSQL and the service with
the rest of the product.
