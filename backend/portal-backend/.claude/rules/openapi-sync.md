---
description: Keep OpenAPI specs in sync with REST API changes
globs: docs/api/**,qubership-apihub-service/controller/**
alwaysApply: false
---

# OpenAPI Sync

- Backend API development is API-first (see `docs/development_guide.md`).
- Any REST endpoint or contract change **must** update the relevant OpenAPI files under `docs/api/`:
  - Public API: `docs/api/APIHUB_API.yaml`
  - Admin API: `docs/api/Admin API.yaml`
  - Internal API: `docs/api/APIHUB_API_internal.yaml` (when internal endpoints change)
- Do not introduce breaking public API changes without versioning and deprecation per the development guide.
