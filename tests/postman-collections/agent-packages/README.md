# Postman E2E agent packages

Local APM packages for **qubership-apihub-postman-collections**.

| Package | Path | Scope |
|---------|------|-------|
| `postman-e2e-authoring` | `postman-e2e-authoring/` | Newman collections, environments, CI wiring (authors in this repo) |
| `postman-e2e-followup` | `postman-e2e-followup/` | Cross-repo reminders for backend developers when E2E follow-up is needed |

Consumers (e.g. `qubership-apihub-backend`) depend on `postman-e2e-followup` via APM.

Validate local packages:

```bash
cd agent-packages/<name> && apm pack
```
