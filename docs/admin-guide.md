# Qubership APIHUB Admin Guide

## Configuration guide

todo

## Maintenance guide

!Under construction

### Database Backup and Restore

#### Local Postgres cluster or cluster with full access

For backup execute the following command:

```
pg_dump --no-owner --format=tar --dbname=postgresql://${APIHUB_DB_USER}:${APIHUB_DB_PASSWORD}@localhost:5432/${APIHUB_DB_NAME} --file=./dbDump.tar  --exclude-table-data=build --exclude-table-data=build_src --exclude-table-data=build_depends --exclude-table-data=build_result --exclude-table-data=builder_task --exclude-table-data=builder_notifications --exclude-schema=migration
```

For restore execute the following command:

```
pg_restore --no-owner --dbname=postgresql://${APIHUB_DB_USER}:${APIHUB_DB_PASSWORD}@localhost:5432/${APIHUB_DB_NAME} ./dbDump.tar
```

For cleaning database execute the following command:

```
psql postgresql://${APIHUB_DB_USER}:${APIHUB_DB_PASSWORD}@localhost:5432/${APIHUB_DB_NAME} -t -c "select 'drop table \"' || tablename || '\" cascade;' from pg_tables where schemaname = 'public'"  | psql postgresql://${APIHUB_DB_USER}:${APIHUB_DB_PASSWORD}@localhost:5432/${APIHUB_DB_NAME}
psql postgresql://${APIHUB_DB_USER}:${APIHUB_DB_PASSWORD}@localhost:5432/${APIHUB_DB_NAME} -t -c "DROP SCHEMA IF EXISTS migration CASCADE"  | psql postgresql://${APIHUB_DB_USER}:${APIHUB_DB_PASSWORD}@localhost:5432/${APIHUB_DB_NAME}
```

*Note:*

Substitute `APIHUB_DB_NAME` `APIHUB_DB_USER` `APIHUB_DB_PASSWORD` with real values.

In local dev environment they are typically are: `apihub_backend` `apihub_backend_user` `apihub_backend_password`
