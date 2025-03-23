# Qubership APIHUB Installation Guide

# 3rd party dependencies

| Name | Version | Mandatory/Optional | Comment |
| ---- | ------- |------------------- | ------- |
| PostgreSQL | 14+ | Mandatory | JDBC connection string |
| GitLab | 14+ | Optional | For APIHUB Editor |
| Minio | 1.2.3 | Optional | For store cold data and reduce load to PG |
| ADFS | Any | Optional | For SSO |
| LDAP | Any | Optional | For User info sync |

# HWE

|     | CPU request | CPU limit | RAM request | RAM limit |
| --- | ----------- | --------- | ----------- | --------- |
| Dev level        | 200m | 4   | 3Gi | 3Gi |
| Production level | 2    | 11  | 9Gi | 9Gi |

# docker-compose

Please refer to [`docker-compose/README.md`](/docker-compose/README.md)

## Minimal parameters set

```INI
APIHUB_POSTGRESQL_DB_NAME=apihub;
APIHUB_POSTGRESQL_USERNAME=apihub;
APIHUB_POSTGRESQL_PASSWORD=apihub;
APIHUB_POSTGRESQL_HOST=pg.local;
APIHUB_POSTGRESQL_PORT=5432;
JWT_PRIVATE_KEY=${any ssh private key, base64 encoded};
APIHUB_ACCESS_TOKEN=${any string}
```

**NOTE:** database should be pre-created

### Full ENV VARs list per container

| Deploy Parameter name | Mandatory | Default Value | Example | Description |
| --- | --- | --- | --- | --- |
| **qubership-apihub-backend** |     |     |     |     |
| APIHUB_POSTGRESQL_HOST | Yes | `localhost` | `postgres.example.com` | PG host address |
| APIHUB_POSTGRESQL_PORT | Yes | `5432` | `5432` | PG port |
| APIHUB_POSTGRESQL_DB_NAME | Yes | `apihub` | `apihub_backend_prod_db` | Logical database in PG cluster for APIHUB. Manual pre-creation required |
| APIHUB_POSTGRESQL_USERNAME | Yes | `apihub` | `apihub_backend_prod_admin` | User for APIHUB_POSTGRESQL_DB_NAME database |
| APIHUB_POSTGRESQL_PASSWORD | Yes | `apihub` | `apihub_backend_prod_password` | Password for APIHUB_POSTGRESQL_USERNAME user. |
| PRODUCTION_MODE | Yes | false | `true` | Enables production mode - login under local apihub users is prohibited in this mode. In this mode only SAML auth is possible, so SAML integration related deploy parameters are mandatory in this case |
| APIHUB_ADMIN_EMAIL | No |  | `admin@example.com` | Default admin user login (example: x_apihub). If set - this admin user will be created automatically. |
| APIHUB_ADMIN_PASSWORD | No |  | `admin-password` | Default admin user password (example: password) |
| APIHUB_ACCESS_TOKEN | Yes |  | `access-token-12345` | Default system access token (any string). The token will be provisioned automatically during bootstrap |
| APIHUB_URL | No |     | `https://apihub.example.com` | Factual APIHUB server URL in your environment. Required only if SAML integration enabled |
| ADFS_METADATA_URL | No |     | `https://adfs.example.com/FederationMetadata/2007-06/FederationMetadata.xml` | SAML metadata URL. If set - enables SAML integration |
| SAML_CRT | No |     | `LS0tLS1CRUdJTi...` | SAML server certificate, base64 encoded. Required only if SAML integration enabled |
| SAML_KEY | No |     | `LS0tLS1CRUdJTi...` | SAML server private key, base64 encoded. Required only if SAML integration enabled |
| DB_TYPE | No | postgres | `postgres` |     |
| DIFF_SERVICE_URL | Yes | `http://localhost:3000` | `http://qubership-build-task-consumer.svc.local:3000` | qubership-build-task-consumer service URL. May vary depends on deploy schema |
| JWT_PRIVATE_KEY | Yes |     | `LS0tLS1CRUdJTiBQUklWQV...` | Self generated private PKCS#8 private key, base64 encoded. Used as unique identifier of APIHUB instace |
| LDAP_SERVER | No | | `ldap://ldap.example.com:389` | LDAP server URL. Required for SAML integration for syncing user inf |
| LDAP_USER | No | | `cn=apihub,dc=example,dc=com` | LDAP User used for connecting to LDAP server |
| LDAP_USER_PASSWORD | No |     | `ldap-password` | Password for LDAP User |
| LDAP_BASE_DN | No |  |  | TODO |
| LDAP_ORGANIZATION_UNIT | No |  |  | TODO |
| LDAP_SEARCH_BASE | No |  |  | TODO |
| MINIO_STORAGE_ACTIVE | No | false | `false` | Set to true to enable S3 integration. S3 is used for store debug data |
| STORAGE_SERVER_USERNAME | No |     | `minio-access-key` | Access Key ID from Minio S3 storage |
| STORAGE_SERVER_BUCKET_NAME | No | | `apihub-bucket` | Bucket name in Minio S3 storage |
| STORAGE_SERVER_CRT | No |     | `LS0tLS1CRUdJTiBQUklWQV...` | Certificate for accessing Minio S3 storage |
| STORAGE_SERVER_URL | No |  | `minio.example.com` | Minio endpoint for client connection |
| STORAGE_SERVER_PASSWORD | No |     | `minio-secret-key` | Secret key for Minio S3 storage access |
| MINIO_STORE_ONLY_BUILD_RESULT | No | false | `true` | Set to true to store only build results (less data amout) in S3 storage |
| ORIGIN_ALLOWED | No |     | `https://example.com` | TODO |
| PUBLISH_ARCHIVE_SIZE_LIMIT_MB | No | 50  | `50` | Limit for uploaded package size in order to avoid OOM |
| PUBLISH_FILE_SIZE_LIMIT_MB | No | 15  | `20` | Limit for uploaded file (inside package) size in order to avoid OOM |
| RELEASE_VERSION_PATTERN | No | ^\[0-9\]{4}\[.\]{1}\[1-4\]{1}$ | `^2023\.1$` | Regex pattern for releases names validation. |
| SYSTEM_NOTIFICATION | No |     | `Maintenance scheduled on 2023-10-15` | If set - footer with this text is shown for alll APIHUB users in APIHUB UI. Designed for maintenance windows. |
| INSECURE_PROXY | No | false | `true` | Set to true to enable apihub playground work without authtorization. |
| MONITORING_ENABLED | No | | `false` | Set to true to enable Prometheus metrics endpoints |
| ARTIFACT_DESCRIPTOR_VERSION | No | `unknown` | `1.1.0` | APIHUB release version, need to be shown in UI |
| BASE_PATH | No |  |  | TODO |
| LOG_LEVEL | No |  |  | Info, Warn, Error, etc |
| GITLAB_URL | No |  |  | Deprecated. Required for Editor feature |
| CLIENT_ID | No |  |  | Deprecated. Required for Editor feature |
| CLIENT_SECRET | No |  |  | Deprecated. Required for Editor feature |
| LISTEN_ADDRESS | Yes | :8080 |  | Need to be set for local run case |
| PG_SSL_MODE | No |  |  | TODO |
| BRANCH_CONTENT_SIZE_LIMIT_MB | No |  |  | TODO |
| BUILDS_CLEANUP_SCHEDULE | No |  |  | "0 1 * * 0" // at 01:00 AM on Sunday |
| METRICS_GETTER_SCHEDULE | No |  |  | "* * * * *" // every minute |
| EXTERNAL_LINKS | No |  |  | TODO |
| DEFAULT_WORKSPACE_ID | No |  |  | TODO |
| CUSTOM_PATH_PREFIXES | No |  |  | TODO |
| ALLOWED_HOSTS | No |  |  | TODO |

| Deploy Parameter name | Mandatory | Default Value | Example | Description |
| --- | --- | --- | --- | --- |
| **qubership-apihub-ui** |     |     |     |     |
| APIHUB_URL | Yes |     | `https://apihub.example.com` | APIHUB server URL. |
| APIHUB_BACKEND_ADDRESS | Yes | apihub-backend:8080 | `apihub-backend:8080` | apihub-backend address. |
| APIHUB_NC_SERVICE_ADDRESS | Yes | apihub-nc-service:8080 | `apihub-nc-service:8080` | Custom add-on service address. |
| DNS_ROUTE_ENABLE | No |     | `true` | Set to true to enable Ingress bounded to external DNS name. |
| DNS_ROUTE | Yes (if DNS_ROUTE_ENABLE=true) |     | `apihub-ui.example.com` | DNS name for Ingress. Required if DNS_ROUTE_ENABLE=true. |
| TLS_CRT | Yes (if DNS_ROUTE_ENABLE=true) |     | `base64-encoded-certificate` | TLS certificate to be set on DNS Ingress. Required if DNS_ROUTE_ENABLE=true |
| TLS_KEY | Yes (if DNS_ROUTE_ENABLE=true) |     | `base64-encoded-private-key` | TLS certificate puplic key to be set on DNS Ingress. Required if DNS_ROUTE_ENABLE=true" |


| Deploy Parameter name | Mandatory | Default Value | Example | Description |
| --- | --- | --- | --- | --- |
| **qubership-apihub-build-task-consumer** |     |     |     |     |
| APIHUB_ACCESS_TOKEN | Yes |     | `access-token-12345` | APIHUB server admin access token. |
| APIHUB_BACKEND_ADDRESS | Yes | apihub-backend:8080 | `apihub-backend:8080` | apihub-backend address. |
| FOLDER_STORE | Yes | /tmp | `/var/lib/apihub/cache` | Folder to store file cache. Not required to be persistence volume |

# Helm

## Prerequisites

1. Install k8s locally
2. Install Helm

## Set up values.yml

TODO

## Execute helm install

TODO