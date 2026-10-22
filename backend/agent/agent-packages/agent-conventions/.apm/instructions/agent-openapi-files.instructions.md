---
description: Agent OpenAPI file list and sync requirements
applyTo: "backend/agent/docs/api/**,backend/agent/controller/**"
---

# Agent OpenAPI Files

Any REST endpoint or contract change **must** update the relevant OpenAPI files under `docs/api/`:

- Agent API: `docs/api/Agent-API_internal.yaml`
- Admin API: `docs/api/Admin-API.yaml`, `docs/api/Admin-API_internal.yaml`

Match existing naming and structure. Do not introduce breaking public API changes without explicit product approval.
