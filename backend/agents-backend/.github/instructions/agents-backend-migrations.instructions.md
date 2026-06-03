---
description: Agents-backend SQL migration path conventions
applyTo: "**/resources/migrations/**"
---

# Agents Backend Database Migrations

- Migrations live in `qubership-apihub-agents-backend/resources/migrations/`.
- Use the next unused numeric prefix (current highest is visible in that directory).
- **Never** reuse or duplicate migration numbers.
- Provide paired `.up.sql` and `.down.sql` files when rollback is required.
- Migrations run at startup via `DBMigrationService` while the init HTTP server is listening; failure stops the process.
