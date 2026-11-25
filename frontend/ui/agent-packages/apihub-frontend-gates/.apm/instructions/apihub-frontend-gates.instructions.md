---
description: Quality gates of a frontend change.
applyTo: "frontend/**,tests/ui-tests/**"
---

Before you report a change in `frontend/` or `tests/ui-tests/` as done, run the `apihub-frontend-gates` skill on the
touched files, or delegate it to the `frontend-verifier` subagent without passing a `model` parameter.
