# Qubership APIHUB — maintenance guide

Operators use this memo for backups, housekeeping, federated authentication references, **and** pointers to granular backend runbooks.

---

## Data operations

### Database backup & restore

Use stock PostgreSQL tools. Skip heavy/ephemeral Builder tables similar to backend recommendations.

Substitute **`APIHUB_DB_SERVER`** (hostname), **`APIHUB_DB_USER`**, **`APIHUB_DB_PASSWORD`**, **`APIHUB_DB_NAME`** with your Registry database (Compose sample: **`apihub_backend`** / **`apihub_backend_user`**, see **`scripts/init-db/init.sql`**). Perform **parallel dumps** for `api_linter` and `agents_backend` schemas if you operate those extensions.

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

### Historical admin guide overlap

Older copies of dumps lived in **`admin-guide`**; authoritative commands now live solely here — follow one source to reduce drift.

### Data TTL & automated cleanup

Backend schedules (revisions/comparisons/soft-delete/unreferenced/builds) are declared in **`config.yaml`** **`cleanup`** block (see **`config.template.yaml`**). Behaviour + operational interpretation: **[`data_maintenance.md`](https://github.com/Netcracker/qubership-apihub-backend/blob/develop/docs/data_maintenance.md)**.

### Schema/internal migration analysis

When migrating stored specs between APIHUB versions, follow **[migration analysis procedure](https://github.com/Netcracker/qubership-apihub-backend/blob/develop/docs/ops_migration_analysis_guide.md)** to read job logs responsibly.

---

## Security

### OIDC / SAML integration

Detailed protocol behaviours: **[`security/security_model.md`](https://github.com/Netcracker/qubership-apihub-backend/blob/develop/docs/security/security_model.md)**.

### Access tokens lifecycle

Operational playbook (system vs personal tokens): **[Access Tokens Management (Wiki)](https://github.com/Netcracker/qubership-apihub/wiki/Access-Tokens-Management)**.

### Personal access tokens

Wiki: **[Manage Personal Access Tokens](https://github.com/Netcracker/qubership-apihub/wiki/DI%E2%80%90Portal%E2%80%90US%E2%80%90001-Manage-Personal-Access-Tokens)**.

### Package roles

Wiki: **[Manage Roles](https://github.com/Netcracker/qubership-apihub/wiki/DI%E2%80%90Portal%E2%80%90GS%E2%80%90001-Manage-Roles)**.

### Global settings surface

Wiki: **[Configuration Parameters](https://github.com/Netcracker/qubership-apihub/wiki/DI%E2%80%90Portal%E2%80%90GS%E2%80%90006-Configuration-Parameters)** (UI-side toggles complementing backend YAML).

---

## Related operator docs in this repo

- [Installation guide](./installation-guide.md)  
- [Configuration reference](./configuration-reference.md)  
- [Admin guide](./admin-guide.md)  
