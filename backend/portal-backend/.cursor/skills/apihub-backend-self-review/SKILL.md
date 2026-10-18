---
name: apihub-backend-self-review
description: Reviews APIHub backend code changes against project standards (AGENTS.md, rules, development guide). Use when the user asks for self-review, code review of a diff, or post-implementation check before commit or PR in qubership-apihub-backend. Invoke explicitly after another agent or model wrote the code.
disable-model-invocation: true
---

# APIHub Backend Self-Review

**Follow `apihub-go-self-review` first** — this skill adds backend-specific checks for `qubership-apihub-backend`.

Independent review of backend changes. **Do not implement fixes unless the user asks** — report findings first.

## Backend-specific checklist

In addition to `apihub-go-self-review`:

### Go conventions (backend)

- [ ] New repos/services/controllers appended at end of section in `Service.go`.
- [ ] Fatal wiring failures use `log.Fatalf` in `Service.go` where appropriate.
- [ ] API error codes/messages use `exception/ErrorCodes.go` constants.

### API and OpenAPI

- [ ] REST changes have matching updates in `docs/api/` (correct spec file: `APIHUB_API.yaml`, `Admin API.yaml`, or `APIHUB_API_internal.yaml`).

### Migrations

- [ ] Run: `bash .cursor/skills/apihub-backend-developer/scripts/check_migration_numbers.sh`

### Documentation

- [ ] Right doc updated per `docs/README.md`; root `README.md` not used for minor features.

### Related repositories

- [ ] If change affects deploy config or REST contract, deployment and Postman follow-up skills were applied (`apihub-deployment-followup`, `postman-e2e-followup`).
- [ ] Reminder includes concrete actions (env vars, new requests), not only "update other repo".

## Output format

Use the same format as `apihub-go-self-review`.
