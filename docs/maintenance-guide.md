# Qubership APIHUB — maintenance guide

Operators use this guide for backups, housekeeping, and pointers to the detailed administration pages. For the
installation-time settings and the system token rotation, see the [admin guide](./admin-guide.md).

---

## Data operations

### Database backup & restore

Use stock PostgreSQL tools. Skip heavy/ephemeral Builder tables similar to backend recommendations.

Substitute **`APIHUB_DB_SERVER`** (hostname), **`APIHUB_DB_USER`**, **`APIHUB_DB_PASSWORD`**, **`APIHUB_DB_NAME`** with
your Registry database (Compose sample: **`apihub_backend`** / **`apihub_backend_user`**, see
**`scripts/init-db/init.sql`**). Perform **parallel dumps** for `api_linter` and `agents_backend` schemas if you operate
those extensions.

```bash
pg_dump --no-owner --format=tar \
  --dbname="postgresql://${APIHUB_DB_USER}:${APIHUB_DB_PASSWORD}@${APIHUB_DB_SERVER}:5432/${APIHUB_DB_NAME}" \
  --file=./registry-dump.tar \
  --exclude-table-data=build \
  --exclude-table-data=build_src \
  --exclude-table-data=build_depends \
  --exclude-table-data=build_result \
  --exclude-table-data=builder_task \
  --exclude-table-data=builder_notifications \
  --exclude-schema=migration
```

```bash
pg_restore --no-owner \
  --dbname="postgresql://${APIHUB_DB_USER}:${APIHUB_DB_PASSWORD}@${APIHUB_DB_SERVER}:5432/${APIHUB_DB_NAME}" \
  ./registry-dump.tar
```

Destructive purge (labs only):

```bash
psql "postgresql://${APIHUB_DB_USER}:${APIHUB_DB_PASSWORD}@${APIHUB_DB_SERVER}:5432/${APIHUB_DB_NAME}" \
  -t -c "select 'drop table \"' || tablename || '\" cascade;' from pg_tables where schemaname = 'public'" \
  | psql "postgresql://${APIHUB_DB_USER}:${APIHUB_DB_PASSWORD}@${APIHUB_DB_SERVER}:5432/${APIHUB_DB_NAME}"
```

### Data TTL & automated cleanup

Backend schedules (revisions/comparisons/soft-delete/unreferenced/builds) are declared in **`config.yaml`**
**`cleanup`** block (see **`config.template.yaml`**). Behaviour + operational interpretation:
**[`data-maintenance.md`](administration/data-maintenance.md)**. Snapshot retention for the Agents backend is in the
[admin guide](./admin-guide.md#extension-services).

### Schema/internal migration analysis

When migrating stored specs between APIHUB versions, follow **[migration analysis
procedure](administration/operations-migration-analysis.md)** to read job logs responsibly.

---

## Security

### OIDC / SAML integration

Detailed protocol behaviours:
**[`security-model.md`](administration/security-model.md)**.

### Access tokens lifecycle

This guide holds the backup procedure. Token handling has one operational home, the
[security checklist in the admin guide](./admin-guide.md#security-operations-checklist), which covers rotating the
system token and the JWT signing key. The behavior of system and personal tokens is in the design item **[Access Tokens
Management](design/package-settings/di-portal-ps-003-access-tokens-management.md)**.

### Personal access tokens

Design item: **[Manage Personal Access
Tokens](design/user-settings/di-portal-us-001-manage-personal-access-tokens.md)**.

### Package roles

Design item: **[Manage Roles](design/global-settings/di-portal-gs-001-manage-roles.md)**.

### Global settings surface

Design item: **[Version Validation](design/global-settings/di-portal-gs-006-version-validation.md)** (UI-side toggles
complementing backend YAML).

---

## Related operator docs in this repo

- [Installation guide](./installation-guide.md)
- [Configuration reference](./configuration-reference.md)
- [Admin guide](./admin-guide.md)
- [Administration topics](./administration/security-model.md) and [design items](./design/README.md)  
