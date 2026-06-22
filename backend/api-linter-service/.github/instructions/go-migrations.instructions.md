---
description: SQL migration numbering and file conventions
applyTo: "**/resources/migrations/**"
---

# Database Migrations

- Use the next unused numeric prefix (check the migrations directory for the current highest).
- **Never** reuse or duplicate migration numbers.
- Provide paired `.up.sql` and `.down.sql` files when rollback is required.
- After adding migrations, run the repository's migration validation script if one is provided (see the repo-specific developer skill).
