# Qubership APIHUB Installation Guide

This guide describes Qubership APIHUB installation process

- [3rd party dependencies](#3rd-party-dependencies)
- [HWE](#hwe)
- [docker-compose](#docker-compose)
  * [Minimal parameters set](#minimal-parameters-set)
  * [Full ENV VARs list per container](#full-env-vars-list-per-container)
- [Helm](#helm)
  * [Prerequisites](#prerequisites)
  * [Set up values.yml](#set-up-valuesyml)
  * [Execute helm install](#execute-helm-install)

# 3rd party dependencies

| Name | Version | Mandatory/Optional | Comment |
| ---- | ------- |------------------- | ------- |
| PostgreSQL | 14+ | Mandatory |  |
| GitLab | 14+ | Optional | For APIHUB Editor. Deprecated |
| S3 | Any | Optional | For store cold data and reduce load to PG |
| SAML provider | Any | Optional | For SSO |
| LDAP | Any | Optional | For User info sync |

# HWE

|     | CPU request | CPU limit | RAM request | RAM limit |
| --- | ----------- | --------- | ----------- | --------- |
| Dev level        | 200m | 4   | 3Gi | 3Gi |
| Production level | 2    | 11  | 9Gi | 9Gi |

# docker-compose

Please refer to [`docker-compose/apihub-generic/README.md`](/docker-compose/apihub-generic/README.md)

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

## Full ENV VARs list per container

| ENV name | Mandatory | Default Value | Example | Description |
| --- | --- | --- | --- | --- |
| **qubership-apihub-backend** |     |     |     |     |
| APIHUB\_POSTGRESQL\_HOST | Yes | localhost | postgres.example.com | PostgreSQL database host  |
| APIHUB\_POSTGRESQL\_PORT | Yes | 5432 | 5432 | PostgreSQL database port |
| APIHUB\_POSTGRESQL\_DB\_NAME | Yes | apihub | apihub\_backend\_prod\_db | Logical database in PostgreSQL cluster for APIHUB. Manual pre-creation required |
| APIHUB\_POSTGRESQL\_USERNAME | Yes | apihub | apihub\_backend\_prod\_admin | User for APIHUB\_POSTGRESQL\_DB\_NAME database |
| APIHUB\_POSTGRESQL\_PASSWORD | Yes | apihub | apihub\_backend\_prod\_password | Password for APIHUB\_POSTGRESQL\_USERNAME user. |
| PRODUCTION\_MODE | No | FALSE | TRUE | Enables production mode - login under local apihub users is prohibited in this mode. In this mode only SAML auth is possible, so SAML integration related deploy parameters are mandatory in this case |
| APIHUB\_ADMIN\_EMAIL | No | "" | admin@example.com | Default local admin user login. If set - this admin user will be created automatically. |
| APIHUB\_ADMIN\_PASSWORD | No | "" | admin-password | Default local admin user password |
| APIHUB\_ACCESS\_TOKEN | Yes | "" | access-token-12345 | Default system access token (any string). The token will be provisioned automatically during startup |
| APIHUB\_URL | Yes | "" | https://apihub.example.com | Factual APIHUB server URL in your environment. |
| AUTO_LOGIN | No | FALSE | TRUE | Enables automatic login with the configured identity provider instead of showing the APIHUB login page. Should be false if more than one IDP is configured |
| EXTERNAL\_SAML\_IDP\_DISPLAY\_NAME | No | "" | External Identity Provider | Display name for external SAML identity provider. |
| EXTERNAL\_SAML\_IDP\_IMAGE_SVG | No | "" | <svg fill="#000000" width="800px"... | SVG image for external SAML identity provider logo. |
| ADFS\_METADATA\_URL | No | "" | [https://idp.example.com/FederationMetadata/2007-06/FederationMetadata.xml](https://idp.example.com/FederationMetadata/2007-06/FederationMetadata.xml) | SAML metadata URL. If set - enables SAML integration |
| SAML\_CRT | No | "" | LS0tLS1CRUdJTi... | SAML server certificate, base64 encoded. Required only if SAML integration enabled |
| SAML\_KEY | No | "" | LS0tLS1CRUdJTi... | SAML server private key, base64 encoded. Required only if SAML integration enabled |
| EXTERNAL\_OIDC\_IDP\_DISPLAY\_NAME | No | "" | External Identity Provider | Display name for external OIDC identity provider. |
| EXTERNAL\_OIDC\_IDP\_IMAGE\_SVG | No | "" | <svg fill="#000000" width="800px"... | SVG image for external OIDC identity provider logo. |
| OIDC\_PROVIDER\_URL | No | "" | https://idp.example.com/realms/apihub | OIDC identity provider URL. Required for OIDC configuration. |
| OIDC\_CLIENT\_ID | No | "" | apihub | OIDC client ID. Required for OIDC configuration. |
| OIDC\_CLIENT\_SECRET | No | "" | l5cKFvwDRSnhBErE9LUGeBk0dqqFB7No | OIDC client secret. Required for OIDC configuration. |
| JWT\_PRIVATE\_KEY | Yes | "" | LS0tLS1CRUdJTiBQUklWQV... | Self generated private PKCS#8 private key, base64 encoded. Used for siging of JWT tokens issued by APIHUB, must be unique fore each APIHUB instance |
| JWT\_ACCESS\_TOKEN\_DURATION\_SEC | No | 3600 | 3600 | Duration in seconds for access tokens issued by APIHUB. |
| JWT\_REFRESH\_TOKEN\_DURATION\_SEC | No | 43200 | 43200 | Duration in seconds for refresh tokens issued by APIHUB. |
| LDAP\_SERVER | No | "" | ldap://ldap.example.com:389 | LDAP server URL. Required for SAML integration for syncing users information |
| LDAP\_USER | No | "" | x\_apihub | LDAP User used for connecting to LDAP server |
| LDAP\_USER\_PASSWORD | No | "" | x\_apihub\_password | Password for LDAP User |
| LDAP\_BASE\_DN | No | "" | organization | Base DN to search users in |
| LDAP\_ORGANIZATION\_UNIT | No | "" | example | Organization unit to search users in |
| LDAP\_SEARCH\_BASE | No | "" | com | Search base to search users in |
| MINIO\_STORAGE\_ACTIVE | No | FALSE | TRUE | Set to true to enable S3 integration. S3 is used for store temporary relatively large files. |
| STORAGE\_SERVER\_USERNAME | No | "" | s3-access-key | Access Key ID from S3 storage |
| STORAGE\_SERVER\_BUCKET\_NAME | No | "" | apihub-bucket | Bucket name in S3 storage |
| STORAGE\_SERVER\_CRT | No | "" | LS0tLS1CRUdJTiBQUklWQV... | Certificate for accessing S3 storage |
| STORAGE\_SERVER\_URL | No | "" | s3.example.com | S3 endpoint for client connection |
| STORAGE\_SERVER\_PASSWORD | No | "" | s3-secret-key | Secret key for S3 storage access |
| MINIO\_STORE\_ONLY\_BUILD\_RESULT | No | FALSE | TRUE | Set to true to store only build results (less data amout) in S3 storage |
| ORIGIN\_ALLOWED | No | "" | [https://localhost:5137](https://localhost:5137/) | Allows to set extra allowed origin to CORS header. Used for FE debugging. Should be empty on prod evs. |
| PUBLISH\_ARCHIVE\_SIZE\_LIMIT\_MB | No | 50 | 50 | Limit for uploaded package size in order to avoid OOM |
| PUBLISH\_FILE\_SIZE\_LIMIT\_MB | No | 15 | 20 | Limit for uploaded file (inside package) size in order to avoid OOM |
| RELEASE\_VERSION\_PATTERN | No | ^\[0-9\]{4}\[.\]{1}\[1-4\]{1}$ | ^2023\\.1$ | Regex pattern for releases names validation. |
| SYSTEM\_NOTIFICATION | No | "" | Maintenance scheduled on 2023-10-15 | If set - footer with this text is shown for all APIHUB users in APIHUB UI. Designed for maintenance windows notifications. |
| INSECURE\_PROXY | No | FALSE | FALSE | Set to true to enable apihub playground work without authtorization. Dangerous. Not recommended |
| MONITORING\_ENABLED | No | FALSE | FALSE | Set to true to enable Prometheus metrics endpoints |
| ARTIFACT\_DESCRIPTOR\_VERSION | No | unknown | 01.02.2003 | APIHUB release version to be shown in UI |
| BASE\_PATH | No | . |  | Base path for binary and static files |
| LOG\_LEVEL | No | INFO | DEBUG | Set log level on init to specified value. Values: Info, Warn, Error, etc |
| GITLAB\_URL | No | "" |  | Deprecated. Required for Editor feature |
| CLIENT\_ID | No | "" |  | Deprecated. Required for Editor feature |
| CLIENT\_SECRET | No | "" |  | Deprecated. Required for Editor feature |
| LISTEN\_ADDRESS | Yes | :8080 |  | Can be used to avoid port conflicts in case of run on bare metall |
| BRANCH\_CONTENT\_SIZE\_LIMIT\_MB | No | 50 | 75 | Deprecated. Required for Editor feature. Size limit for the branch content. |
| BUILDS\_CLEANUP\_SCHEDULE | No | 0 1 \* \* 0 | 0 1 \* \* 0 | Temporary data cleanup job schedule |
| EXTERNAL\_LINKS | No | "" |  | Links to be shown under (i) button in UI |
| DEFAULT\_WORKSPACE\_ID | No | "" | QS | Default workspace ID for Agent UI |
| CUSTOM\_PATH\_PREFIXES | No | "" |  | Allows to specify custom paths for extension (plug-in) backend services |
| ALLOWED\_HOSTS | No | "" | \*.example.com | Allowed list of hosts that are accepted for proxy(playground) requests. |
| REVISIONS\_TTL\_DAYS | No | 360 | 180 | Number of days to keep revisions before cleanup. |
| REVISIONS\_CLEANUP\_DELETE\_LAST\_REVISION | No | false | true | If set to true, the revisions cleanup job will delete the last revision of the version. Otherwise, such revisions are skipped. |
| REVISIONS\_CLEANUP\_DELETE\_RELEASE\_REVISIONS | No | false | true | If set to true, the revisions cleanup job will delete revisions with a 'release' status. Otherwise, such revisions are skipped. |

| Deploy Parameter name | Mandatory | Default Value | Example | Description |
| --- | --- | --- | --- | --- |
| **qubership-apihub-ui** |     |     |     |     |
| APIHUB_URL | Yes |     | `https://apihub.example.com` | APIHUB server URL. |
| APIHUB_BACKEND_ADDRESS | Yes | apihub-backend:8080 | `apihub-backend:8080` | apihub-backend address. |
| APIHUB_NC_SERVICE_ADDRESS | Yes | apihub-nc-service:8080 | `apihub-nc-service:8080` | Custom add-on service address. |

| Deploy Parameter name | Mandatory | Default Value | Example | Description |
| --- | --- | --- | --- | --- |
| **qubership-apihub-build-task-consumer** |     |     |     |     |
| APIHUB_ACCESS_TOKEN | Yes |     | `access-token-12345` | APIHUB server admin access token. |
| APIHUB_BACKEND_ADDRESS | Yes | apihub-backend:8080 | `apihub-backend:8080` | apihub-backend address. |
| FOLDER_STORE | Yes | /tmp | `/var/lib/apihub/cache` | Folder to store file cache. Not required to be persistence volume |

# Helm

Qubership APIHUB Helm Chart located here: [`helm-templates/qubership-apihub`](/helm-templates/qubership-apihub)

## Prerequisites

1. kubectl installed and configured for k8s cluster access. Namespace admin permissions required.
1. Helm installed
1. Supported k8s version - 1.23+

## Set up values.yml

1. Download Qubership APIHUB helm chart
1. Fill `values.yaml` with corresponding deploy parameters. `values.yaml` is self-documented, so please refer to it

## Execute helm install

In order to deploy Qubership APIHUB to your k8s cluster execute the following command:

```
helm install apihub -n apihub --create-namespace -f ./helm-templates/qubership-apihub/values.yaml ./helm-templates/qubership-apihub
```

In order to uninstall Qubership APIHUB from your k8s cluster execute the following command:

```
helm uninstall apihub -n apihub
```
