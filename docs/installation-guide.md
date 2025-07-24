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

For **qubership-apihub-backend**:
```YAML
database:
  host: 'pg.local'
  port: 5432
  name: 'apihub'
  username: 'apihub'
  password: 'apihub'
security:
  productionMode: false
  jwt:
    privateKey: '{use generated key here}'
  apihubExternalUrl: 'https://apihub.example.com'
zeroDayConfiguration:
  accessToken: '<put_your_key_here - any random string, minimum 30 characters>'
  adminEmail: '<admin_login, example: apihub@mail.com>'
  adminPassword: '<admin_password, example: password>''
```

For **qubership-apihub-build-task-consumer**
```INI
APIHUB_ACCESS_TOKEN=${any string, minimal 30 characters}
```

**NOTE:** database should be pre-created

## Full ENV VARs list per container

| ENV name | Mandatory | Default Value | Example | Description |
| --- | --- | --- | --- | --- |
| **qubership-apihub-backend** |     |     |     |     |
| APIHUB\_CONFIG\_FOLDER | No | ./ | /app | Directory path where the application looks for the config.yaml configuration file |
| LOG\_LEVEL | No | INFO | DEBUG | Set log level on init to specified value. Values: Info, Warn, Error, etc |

qubership-apihub-backend configuration is implemented via a configuration file(config.yaml), for the full configuration please refer to [the template file](https://github.com/Netcracker/qubership-apihub-backend/blob/develop/qubership-apihub-service/config.template.yaml).

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
helm install apihub -n qubership-apihub --create-namespace -f ./helm-templates/qubership-apihub/values.yaml ./helm-templates/qubership-apihub
```

In order to uninstall Qubership APIHUB from your k8s cluster execute the following command:

```
helm uninstall apihub -n qubership-apihub
```
