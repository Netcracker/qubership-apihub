---
paths:
  - "docs/api/**"
  - "qubership-apihub-agents-backend/controller/**"
---

# Agents Backend OpenAPI Files

Any REST endpoint or contract change **must** update the relevant OpenAPI files under `docs/api/`:

- Public API: `docs/api/Agents-Backend-API.yaml`
- Admin API: `docs/api/Admin-API.yaml`
- Internal API: `docs/api/Agents-Backend-API_internal.yaml` (when internal endpoints change)

Do not introduce breaking public API changes without versioning and deprecation.
