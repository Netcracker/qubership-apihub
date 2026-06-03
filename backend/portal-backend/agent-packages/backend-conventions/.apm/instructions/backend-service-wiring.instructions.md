---
description: Service.go wiring conventions for qubership-apihub-backend
applyTo: qubership-apihub-service/**/*.go
---

# Service.go Wiring

- Add new repositories, services, and controllers at the **end** of their corresponding sections in `Service.go`.
- Use `log.Fatalf` for fail-fast fatal errors during wiring/startup in `Service.go` when initialization cannot continue.
