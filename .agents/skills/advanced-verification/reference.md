# Advanced Verification — reference

All paths are relative to the repository root unless stated otherwise.

## Postgres readiness

Probe before building or starting anything.

**Linux / WSL / Git Bash:**

```bash
pg_isready -h localhost -p 5432 -U apihub
```

**Windows PowerShell (native), no `pg_isready` on PATH:**

```powershell
Test-NetConnection -ComputerName localhost -Port 5432
```

If Postgres is not reachable, ask the user before starting anything. The module's local DB stack:

```bash
docker compose -f backend/portal-backend/docs/local_development/docker-compose/DB/docker-compose.yml up -d
```

This provisions Postgres with database, user, and password `apihub`.

## Scratch config

There is no committed local config. Copy `backend/portal-backend/config.template.yaml` into a scratch folder and set
at least the values from `backend/portal-backend/docs/local_development/local_development.md`:

- `database.*` for the local Postgres.
- `security.productionMode: false` (the default `true` refuses to start without an identity provider).
- `security.jwt.privateKey`: base64 PKCS#8 RSA key, see `docs/local_development/generate_jwt_pkey.sh`.
- `zeroDayConfiguration.accessToken`: any random string of at least 30 characters. It is the `api-key` for Newman.
- `technicalParameters.listenAddress`: for example `:8090`. Pick another port if it is taken.
- The distributed cache ports: set them explicitly, or a second local instance dies silently (see
  `backend/portal-backend/docs/running-and-probing.md`).

**Bash:**

```bash
mkdir -p /tmp/portal-config
cp backend/portal-backend/config.template.yaml /tmp/portal-config/config.yaml
```

**PowerShell:**

```powershell
New-Item -ItemType Directory -Force $env:TEMP\portal-config | Out-Null
Copy-Item backend\portal-backend\config.template.yaml $env:TEMP\portal-config\config.yaml
```

Config values are read only from `config.yaml` under `APIHUB_CONFIG_FOLDER`; there is no automatic env binding.
Discard the scratch folder when done and never commit it.

## Build and run

```bash
cd backend/portal-backend
go build .
```

Do not pass `GOOS=linux` or `GOARCH=amd64` (container builds only). The working directory must stay
`backend/portal-backend` when starting the binary.

**Bash:**

```bash
APIHUB_CONFIG_FOLDER=/tmp/portal-config ./portal-backend
```

**PowerShell:**

```powershell
$env:APIHUB_CONFIG_FOLDER = "$env:TEMP\portal-config"
.\portal-backend.exe
```

The binary name follows the directory (`go build .` names it after the module path's last element). If your build
produced another name, use that. Confirm the listener belongs to your process and check your own log for a fatal line
before trusting `/live`.

## Postman collection conventions

Follow the structure of the existing collections in `backend/portal-backend/tests/api/`, for example
`tolerant_publication.postman_collection.json`:

- `info.description` states purpose, endpoints under test, auth method, and required collection variables.
- `variable[]` declares `baseUrl` (for example `http://localhost:8090`) and `apiKey` (the zero-day token of your
  scratch config), plus any test-specific IDs.
- `item[]` is grouped into numbered folders (for example `"00 — Setup"`, `"01 — <feature>"`).
- Each request that needs one carries a `prerequest` or `test` script using `pm.test(...)`,
  `pm.collectionVariables.set(...)`, and `pm.response.to.have.status(...)`.
- Auth header is `api-key: {{apiKey}}` (sysadm token), not JWT.
- Throwaway resource IDs get a `Date.now()` suffix for isolation and safe re-runs.

## Running the collection

```bash
pnpm dlx newman@6.2.3 run backend/portal-backend/tests/api/<slug>.postman_collection.json \
  --env-var baseUrl=http://localhost:8090 \
  --env-var apiKey=<zero-day token from the scratch config>
```

Newman 6.2.3 is the version CI uses for the shared suite (`tools/ci/e2e-collections.sh`). The shared E2E suite in
`tests/postman-collections` runs through the E2E workflows, not through this command.

## Reading failures

Newman prints a per-request assertion summary and a final failure table. Match each failed `pm.test` name back to the
request's endpoint and the Go handler, service, or repository that implements it. Fix the root cause there (do not
adjust the test to mask a real bug), rebuild, restart the service, and rerun the same Newman command until all
assertions pass.
