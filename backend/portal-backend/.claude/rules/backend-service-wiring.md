---
paths:
  - "**/*.go"
---

# main.go Wiring

- Add new repositories, services, and controllers at the **end** of their corresponding sections in `main.go`.
- Use `log.Fatalf` for fail-fast fatal errors during wiring/startup in `main.go` when initialization cannot continue.
