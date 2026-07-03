---
description: Conventions for consuming next-data-model inside api-doc-viewer viewer code.
applyTo: "packages/api-doc-viewer/src/**/*.{ts,tsx}"
---

When importing `@netcracker/qubership-apihub-next-data-model` in api-doc-viewer
to build trees, traverse nodes, or wire diff styling — without changing
`packages/next-data-model/src` — apply the `next-data-model-using` skill.
