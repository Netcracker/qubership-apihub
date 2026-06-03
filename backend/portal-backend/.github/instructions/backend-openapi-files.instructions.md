---
description: Backend OpenAPI file list and sync requirements
applyTo: docs/api/**,qubership-apihub-service/controller/**
---

# Backend OpenAPI Files

Any REST endpoint or contract change **must** update the relevant OpenAPI files under `docs/api/`:

- Public API: `docs/api/APIHUB_API.yaml`
- Admin API: `docs/api/Admin API.yaml`
- Internal API: `docs/api/APIHUB_API_internal.yaml` (when internal endpoints change)

Do not introduce breaking public API changes without versioning and deprecation per `docs/development_guide.md`.
