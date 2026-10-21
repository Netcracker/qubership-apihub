# Postman E2E agent packages

Local APM packages for `tests/postman-collections` of the qubership-apihub monorepo. They are listed in the root
`apm.yml` and deployed with `apm install --target cursor,claude --legacy-skill-paths` from the repository root.

| Package | Path | Scope |
|---------|------|-------|
| `postman-e2e-authoring` | `postman-e2e-authoring/` | Newman collections, environments, CI wiring |
| `postman-e2e-followup` | `postman-e2e-followup/` | Reminder for backend authors when E2E follow-up is needed (applies to `backend/portal-backend/docs/api/` and `controller/`) |

Do not run `apm compile`; the `AGENTS.md` files are hand-written.
