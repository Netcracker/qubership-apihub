# Advanced Verification — reference

## Postgres readiness

Probe before building or starting anything:

**Linux / WSL / Git Bash:**

```bash
pg_isready -h localhost -p 5432 -U apihub
```

**Windows PowerShell (native), no `pg_isready` on PATH:**

```powershell
Test-NetConnection -ComputerName localhost -Port 5432
```

If Postgres is not reachable, ask the user before starting anything. The repo's local DB stack:

```bash
docker-compose -f docs/local_development/docker-compose/DB/docker-compose.yml up -d
```

This provisions Postgres with database/user/password `apihub`/`apihub`/`apihub`, matching
`qubership-apihub-service/local_config/config.yaml`.

## Build and run

```bash
cd qubership-apihub-service
go build .
```

Do not pass `GOOS=linux`/`GOARCH=amd64` (used only by `build_golang_binary.cmd` for the
container image) — build for the host platform for a local run.

Start with the local config, from `qubership-apihub-service/`:

**Bash:**

```bash
APIHUB_CONFIG_FOLDER=./local_config ./qubership-apihub-service
```

**PowerShell:**

```powershell
$env:APIHUB_CONFIG_FOLDER = './local_config'
.\qubership-apihub-service.exe
```

`local_config/config.yaml` sets `technicalParameters.listenAddress: ':8090'` and a
zero-day sysadm token (`zeroDayConfiguration.accessToken`) that is auto-provisioned at startup —
use it directly as the `api-key` header, no login flow required.

## Overriding the listen port temporarily

There is no environment-variable override for config values in this codebase (config is read
only from the `config.yaml` under `APIHUB_CONFIG_FOLDER`, no automatic env binding). If port
8090 is already taken, copy the config instead of editing the committed file:

**Bash:**

```bash
cp -r qubership-apihub-service/local_config /tmp/local_config_override
sed -i "s/listenAddress: ':8090'/listenAddress: ':<free-port>'/" /tmp/local_config_override/config.yaml
APIHUB_CONFIG_FOLDER=/tmp/local_config_override ./qubership-apihub-service
```

**PowerShell:**

```powershell
Copy-Item -Recurse qubership-apihub-service\local_config $env:TEMP\local_config_override
(Get-Content $env:TEMP\local_config_override\config.yaml) -replace "listenAddress: ':8090'", "listenAddress: ':<free-port>'" |
    Set-Content $env:TEMP\local_config_override\config.yaml
$env:APIHUB_CONFIG_FOLDER = "$env:TEMP\local_config_override"
.\qubership-apihub-service\qubership-apihub-service.exe
```

Discard the copy when done; never commit changes to `local_config/config.yaml` for a port
override.

## Postman collection conventions

Follow the structure already established by `tests/api/build_dependencies.postman_collection.json`:

- `info.description` states purpose, endpoints under test, auth method, and required collection
  variables.
- `variable[]` declares `baseUrl` (default `http://localhost:8090`) and `apiKey` (default to the
  local zero-day token), plus any test-specific IDs.
- `item[]` is grouped into numbered folders (e.g. `"00 — Setup"`, `"01 — <feature>"`).
- Each request that needs one carries a `prerequest` and/or `test` script using
  `pm.test(...)`, `pm.collectionVariables.set(...)`, `pm.response.to.have.status(...)`.
- Auth header is `api-key: {{apiKey}}` (sysadm token), not JWT.
- Throwaway resource IDs get a `Date.now()` suffix for isolation and safe re-runs.

## Running the collection

```bash
npx newman run tests/api/<slug>.postman_collection.json \
  --env-var baseUrl=http://localhost:8090 \
  --env-var apiKey=<zero-day token from local_config/config.yaml>
```

There is no existing local Newman wrapper script in this repo — this is the first one; the
external `qubership-apihub-postman-collections` repo's canonical E2E suite is run by a separate
reusable CI workflow, not by this command.

## Reading failures

Newman prints a per-request assertion summary and a final failure table to the console. Match
each failed `pm.test` name back to the request's endpoint and the Go handler/service/repository
that implements it, fix the root cause there (do not adjust the test to mask a real bug), rebuild,
restart the service, and rerun the same Newman command until all assertions pass.
