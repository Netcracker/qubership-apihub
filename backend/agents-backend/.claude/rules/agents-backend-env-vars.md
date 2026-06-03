---
paths:
  - "qubership-apihub-agents-backend/service/system_info.go"
  - "qubership-apihub-agents-backend/**/*.go"
---

# Agents Backend Environment Variables

- **Single source of truth:** `service/system_info.go` — read env vars in `Init()` and expose via `SystemInfoService` getters.
- **No YAML config** — do not add viper/config files; all runtime settings are environment variables.
- **PostgreSQL:** use `AGENTS_BACKEND_POSTGRESQL_*` prefix (`HOST`, `PORT`, `DB_NAME`, `USERNAME`, `PASSWORD`).
- **Defaults:** define defaults in `system_info.go` setters (e.g. `localhost`, `5432`, `apihub_agents_backend`) — do not duplicate as scattered literals in services.
- **New env var:** add constant, setter, getter in `system_info.go`; wire usage in services; update Helm values in `qubership-apihub` when deploy-visible.
