# Qubership APIHUB Maintenance Guide

This guide describes various Qubership APIHUB maintenance procedures, settings and principles.

- [Data operations](#data-operations)
  * [DB Backup & Restore](#db-backup---restore)
  * [Data TTL](#data-ttl)
  * [Data migration](#data-migration)
- [Security](#security)
  * [OIDC/SAML integration](#oidc-saml-integration)
  * [Access Tokens Management](#access-tokens-management)
  * [Personal Access Tokens](#personal-access-tokens)
  * [Package roles](#package-roles)
- [Global Settings](#global-settings)

# Data operations

## DB Backup & Restore

No special tools required for making Qubership APIHUB Postgres database backup & restore. Just use official `pg_dump` and `pg_restore` tools.

The only trick is that some tables in the database contains temprary data and can be skipped during backing up.

Commands for reference:

**Backup**

```
pg_dump --no-owner --format=tar --dbname=postgresql://${APIHUB_DB_USER}:${APIHUB_DB_PASSWORD}@${APIHUB_DB_SERVER}:5432/${APIHUB_DB_NAME} --file=./dbDump.tar  --exclude-table-data=build --exclude-table-data=build_src --exclude-table-data=build_depends --exclude-table-data=build_result --exclude-table-data=builder_task --exclude-table-data=builder_notifications --exclude-schema=migration
```

**Restore**
```
pg_restore --no-owner --dbname=postgresql://${APIHUB_DB_USER}:${APIHUB_DB_PASSWORD}@${APIHUB_DB_SERVER}:5432/${APIHUB_DB_NAME} ./dbDump.tar
```

## Data TTL

Please refer to [Data Maintenance guide](https://github.com/Netcracker/qubership-apihub-backend/blob/develop/docs/data_maintenance.md)

## Data migration 

By "data migration" we call procedure which calculates internal representation of API specifications from original API specifications files.

Here is a guide how to interpret data migration procedure status (logs) to understand if there are any errors or suspicios results: [Migration analysis procedure](https://github.com/Netcracker/qubership-apihub-backend/blob/develop/docs/ops_migration_analysis_guide.md)


# Security

## OIDC/SAML integration

Please find auth flow description here [Qubership APIHUB authentication description](https://github.com/Netcracker/qubership-apihub-backend/blob/develop/docs/security/security_model.md)

## [Access Tokens Management](https://github.com/Netcracker/qubership-apihub/wiki/Access-Tokens-Management)

## [Personal Access Tokens](https://github.com/Netcracker/qubership-apihub/wiki/DI%E2%80%90Portal%E2%80%90US%E2%80%90001-Manage-Personal-Access-Tokens)

## [Package roles](https://github.com/Netcracker/qubership-apihub/wiki/DI%E2%80%90Portal%E2%80%90GS%E2%80%90001-Manage-Roles)

# [Global Settings](https://github.com/Netcracker/qubership-apihub/wiki/DI%E2%80%90Portal%E2%80%90GS%E2%80%90006-Configuration-Parameters)