---
description: Conventions for api-doc-viewer screenshot integration tests.
applyTo: "packages/api-doc-viewer/src/it/**/*.ts"
---

When writing or editing screenshot integration tests under
`packages/api-doc-viewer/src/it`, apply the `api-doc-viewer-testing` skill.

When investigating hangs, timeouts, snapshot drift, or story-not-found failures, read the
skill section **Screenshot test troubleshooting (read first)** before changing timeouts,
workers, or snapshot thresholds.
