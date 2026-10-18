---
description: Go constants, literals, and HTTP status code conventions
applyTo: "**/*.go"
---

# Go Constants and HTTP Status

## Constants and literals

- Do not use magic numbers; declare named constants.
- If a numeric literal is unavoidable, add a brief comment explaining what it is and why that value is used.
- If a string literal is repeated, extract it to a constant.
- Do **not** duplicate config defaults in service code. Defaults belong in centralized config initialization; valid ranges belong on config struct fields via validation tags checked at startup. Services read validated config directly — no `if cfg.X <= 0 { fallback }` for config-backed values.

## HTTP status codes

- Use `net/http` named constants (`http.StatusOK`, `http.StatusBadRequest`, `http.StatusNotFound`, etc.).
- Do not use raw status integers (e.g. `200`, `400`, `404`) in handlers, middleware, or tests.
