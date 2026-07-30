# APIHUB Agents Backend Developer — Reference

Read this file when you need agents-backend-specific examples or doc-routing detail. Keep `SKILL.md` as the workflow checklist. Generic patterns are in `apihub-go-developer/reference.md`.

## Doc routing (where to update documentation)

| Change type | Update |
|-------------|--------|
| New or changed REST contract | `docs/api/Agents-Backend-API.yaml` (+ `Admin-API.yaml`, `Agents-Backend-API_internal.yaml` if applicable) |
| Operational / architecture notes | `docs/recources/` (existing diagrams) |
| AI assistant behaviour | `AGENTS.md`, `agent-packages/` |

## Environment variables

All configuration is env-only via `service/system_info.go`. Key groups:

| Group | Variables |
|-------|-----------|
| PostgreSQL | `AGENTS_BACKEND_POSTGRESQL_HOST`, `AGENTS_BACKEND_POSTGRESQL_PORT`, `AGENTS_BACKEND_POSTGRESQL_DB_NAME`, `AGENTS_BACKEND_POSTGRESQL_USERNAME`, `AGENTS_BACKEND_POSTGRESQL_PASSWORD` |
| APIHUB | `APIHUB_URL`, `APIHUB_ACCESS_TOKEN` |
| Paths | `BASE_PATH`, `API_SPEC_DIR` |
| Server | `LISTEN_ADDRESS`, `ORIGIN_ALLOWED`, `LOG_LEVEL` |
| Snapshots cleanup | `SNAPSHOTS_CLEANUP_SCHEDULE`, `SNAPSHOTS_TTL_DAYS` |
| Proxy (deprecated path) | `INSECURE_PROXY` |

## Error codes (`exception/errors.go`)

**Good:**

```go
const AgentNotFound = "4"
const AgentNotFoundMsg = "Agent '$agentId' not found"
```

Use existing patterns for parameter placeholders (`$agentId`, `$param`, etc.). Do not inline error code strings in controllers or services.

## service.go wiring

- Add `repository.New...` with other repository constructors (end of repository block).
- Add `service.New...` with other services (end of service block).
- Add `controller.New...` with other controllers (end of controller block).
- Use `log.Fatalf` or `panic` when service construction failure must stop startup (see existing patterns).

## Migration files

Naming: `{N}_{description}.up.sql` and `{N}_{description}.down.sql` where `N` is the next free integer.

Directory: `qubership-apihub-agents-backend/resources/migrations/`

## OpenAPI files

| File | Purpose |
|------|---------|
| `docs/api/Agents-Backend-API.yaml` | Public REST API |
| `docs/api/Admin-API.yaml` | Admin/debug endpoints |
| `docs/api/Agents-Backend-API_internal.yaml` | Internal endpoints |

## Further reading

- `AGENTS.md` — agent contract (loaded every session)
- `LLM/qubership-apihub-agents-backend.md` — architecture overview (when available in workspace)
