# Compose stack for debugging portal-backend

This stack runs everything except the backend: PostgreSQL, the UI, and the builder. You run `portal-backend` from your
IDE and debug it while the rest of the product talks to it. The step-by-step recipe is in the
[local run guide](../../../docs/development/local-run.md#backend-from-the-ide-the-rest-in-compose); this page covers
what is specific to this stack.

## Prerequisites

- Podman with the compose plugin (Docker Compose also works).
- A PostgreSQL client such as pgAdmin, if you want to look into the database.
- The backend sources and a Go toolchain, as described in the
  [getting started guide](../../../docs/development/getting-started.md).

## What the stack contains

| Service | Address | Notes |
|---------|---------|-------|
| `postgres` | `localhost:5432`, user `postgres`, password `postgres` | `scripts/init-db/init.sql` creates the database `apihub_backend` with the user `apihub_backend_user` and the password `apihub_backend_password` |
| `qubership-apihub-ui` | <http://localhost:8080> | `qubership-apihub-ui.env` points it at the backend on `localhost:8090` |
| `qubership-apihub-build-task-consumer` | `localhost:3000` | `qubership-apihub-build-task-consumer.env` points it at the backend on `localhost:8090` |

The services use `network_mode: host`. On Linux they reach a backend that runs on your machine. On Windows and macOS
the host network belongs to the Podman machine, so the containers cannot reach your IDE; use the generic stack with
the steps in the local run guide instead.

## Configure and start

1. Set the same token in two places: `APIHUB_API_KEY` in `qubership-apihub-build-task-consumer.env`, and
   `zeroDayConfiguration.accessToken` in the backend `config.yaml` below.
2. Start the stack:

   ```bash
   podman compose up
   ```

3. Create a folder for the backend configuration outside the repository, for example `~/apihub-local/`, and put a
   `config.yaml` in it. `portal-backend` reads its settings from this file only, not from environment variables.
   Start from [`config.template.yaml`](../../../backend/portal-backend/config.template.yaml) and set at least:

   ```yaml
   database:
     host: 'localhost'
     port: 5432
     name: 'apihub_backend'
     username: 'apihub_backend_user'
     password: 'apihub_backend_password'
   security:
     productionMode: false
     jwt:
       privateKey: '<base64 of a PKCS#8 RSA key, 2048 to 4096 bits>'
     apihubExternalUrl: 'http://localhost:8080'
   zeroDayConfiguration:
     accessToken: '<the token from step 1, at least 30 characters>'
     adminEmail: 'admin@example.com'
     adminPassword: '<a password>'
   technicalParameters:
     listenAddress: ':8090'
     apiSpecDirectory: './docs/api'
   ```

   The [configuration reference](../../../docs/configuration-reference.md) describes every key.

## Run the backend from VS Code

Add a launch configuration. The working directory must be `backend/portal-backend`, because the backend finds its
migrations and static assets relative to it. `APIHUB_CONFIG_FOLDER` names the folder with your `config.yaml`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "portal-backend",
      "type": "go",
      "request": "launch",
      "mode": "auto",
      "program": "${workspaceFolder}/backend/portal-backend",
      "cwd": "${workspaceFolder}/backend/portal-backend",
      "env": {
        "APIHUB_CONFIG_FOLDER": "${userHome}/apihub-local"
      }
    }
  ]
}
```

Open <http://localhost:8080/login> and sign in with the admin email and password from `config.yaml`. The IDE settings
for other editors are in the [debugging guide](../../../docs/development/debugging.md#go-service).

## Stop the stack

```bash
podman compose down
```

The database lives in the container (`PGDATA=/pgdata`), so `down` deletes it. To keep it, remove the `PGDATA` line from
`docker-compose.yml`. Postgres then writes to the `data/` folder next to the compose file, which Git ignores.
