---
description: API-first OpenAPI sync principle for REST changes
applyTo: "docs/api/**,**/controller/**"
---

# API-First OpenAPI

- Backend API development is API-first (see the repository development guide).
- Any REST endpoint or contract change **must** update the relevant OpenAPI files under the repository's API docs directory.
- Do not introduce breaking public API changes without versioning and deprecation per the development guide.
