---
paths:
  - "frontend/ddlapi/**/*.ts"
  - "frontend/api-diff/**/*.ts"
  - "frontend/api-doc-viewer/**/*.ts"
  - "frontend/api-processor/**/*.ts"
  - "frontend/api-unifier/**/*.ts"
  - "frontend/ui/**/*.ts"
---

When writing TypeScript that imports `@netcracker/qubership-apihub-ddlapi` or
`@netcracker/qubership-apihub-ddlapi/parser` — parsing DDL with `buildFromDdl`,
traversing a `Realm`/`Schema`/`Table`, or constructing schema objects with its
factories — apply the `ddlapi-using` skill.
