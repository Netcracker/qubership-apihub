---
paths:
  - "qubership-apihub-agent/**"
---

# No Database Layer

`qubership-apihub-agent` is a stateless K8s sidecar. It does **not** use PostgreSQL or file-based migrations.

- Do not add `repository/`, SQL migrations, or go-pg entities.
- Persisted state lives in APIHUB (via `ApihubClient`) and agents-backend (via `AgentsBackendClient`).
- In-memory caches (`NamespaceListCache`, `ServiceListCache`) are ephemeral; TTL comes from config.

Ignore `go-migrations` and `sql-performance` instructions unless the task explicitly targets another repository.
