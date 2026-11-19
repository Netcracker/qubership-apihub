---
description: CI linter rules for every file of the api-doc-viewer module.
applyTo: "frontend/api-doc-viewer/**/*"
---

Before you add or change any file under `frontend/api-doc-viewer/` (Markdown, CSS, SQL fixtures, TypeScript, YAML, or
anything else), apply the `api-doc-viewer-ci-linters` skill. CI lints every file a pull request touches as a whole, so
the rules apply to the lines you did not write as well.
