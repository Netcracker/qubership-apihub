---
name: apihub-agents-backend-developer
description: "Implements and modifies the APIHUB Agents Backend Go service (qubership-apihub-agents-backend): agent CRUD, discovery orchestration, snapshots, proxy, namespace security, env-only config, and OpenAPI specs. Use when adding or changing agents-backend features, REST endpoints, SQL migrations, repository queries, or Go code in qubership-apihub-agents-backend."
---

# APIHUB Agents Backend Developer

**Follow `apihub-go-developer` first** — this skill adds agents-backend-specific rules for `qubership-apihub-agents-backend` only.

Follow `AGENTS.md` and project rules. For examples and doc routing, see [reference.md](reference.md).

## Agents-backend-specific workflow

1. **Errors** — new API error codes/messages as constants in `exception/errors.go`.
2. **Wiring** — new repos/services/controllers at the **end** of their section in `service.go`; `log.Fatalf` / `panic` for fatal startup wiring errors (match existing patterns).
3. **Config** — all runtime settings via environment variables read in `service/system_info.go`; do not introduce YAML config files.
4. **Migrations** — files in `qubership-apihub-agents-backend/resources/migrations/`; use next unused numeric prefix.
5. **OpenAPI** — update `docs/api/*.yaml` when REST contract changes (see deployed `agents-backend-conventions` rules).
6. **Related repos** — if the change touches deploy config, env vars, or REST contracts, remind the developer about Helm charts and/or the agent repo per `AGENTS.md`.

## Domain areas (read before changing behaviour)

| Area | Key files |
|------|-----------|
| Agent CRUD / heartbeats | `service/agent.go`, `controller/agent.go`, `repository/agent.go` |
| Discovery orchestration | `service/discovery.go`, `controller/discovery.go`, `client/agent.go` |
| Snapshots | `service/snapshot.go`, `controller/snapshot.go`, `service/cleanup.go` |
| Agent proxy | `controller/proxy.go`, routes in `service.go` |
| Namespace security | `service/namespace_security.go`, `controller/namespace_security.go` |
| APIHUB integration | `client/apihub.go`, `service/permission.go` |

## Startup and migration pattern

`service.go` starts a temporary init HTTP server, runs DB migrations in a goroutine, shuts down the init server, then continues full wiring. Do not reorder this sequence without understanding health/readiness (`/live`, `/ready`) and migration failure handling.

## Completion checklist (agents-backend additions)

In addition to the `apihub-go-developer` checklist:

- [ ] Go conventions and `service.go` / `exception/errors.go` rules followed.
- [ ] REST changes reflected in `docs/api/*.yaml`.
- [ ] New env vars documented in `service/system_info.go` and `agents-backend-conventions` rules.
- [ ] Migrations use unique numeric prefix.
- [ ] **Related repositories** — if applicable, reminded developer about Helm and/or agent repo updates (see `AGENTS.md`).

### Related repositories (reminder block)

When the feature matches criteria in `AGENTS.md`, end your message with:

```markdown
### Related repositories (follow-up outside this repo)
- **Helm**: <what to check + repo URL from AGENTS.md>
- **Agent**: <what to add/update + repo URL>
```

Omit sections that do not apply.

Suggest invoking `apihub-go-self-review` in a **new chat** or with a **different model** for an independent pass over the diff.
