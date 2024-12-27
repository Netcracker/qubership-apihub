# APIHUB docker-compose local deployment

## Prerequisites

Install **podman** with **compose** plugin.

For PostgreSQL access install PGADmin or any other similar tool.

## Parameters setup

Review *.env files in this folder and fill values for the following ones:

```
JWT_PRIVATE_KEY=<put_your_key_here - ssh private key base64 encoded>
APIHUB_ADMIN_EMAIL=<admin_login, example: apihub>
APIHUB_ADMIN_PASSWORD=<admin_password, example: password>
APIHUB_ACCESS_TOKEN=<put_your_key_here - any random string>
```

For database access install PGAdmin and connect to localhost:5432 postgres/postgres

## Start

Execute `podman compose up`

## Stop

Execute `podman compose down`

## Usage

http://localhost:8081/login

## Startup with locally built images

If you want to start APIHUB via compose with locally build docker image of any module you need to do the following:

1. Build module repository (ex: qubership-apihub-backend) by executing its build.cmd/sh
2. Change `image` URI in docker-compose.yml from `ghcr.io/netcarcker/qubership-apihub-backend:latest` to `localhost/netcracker/qubership-apihub-backend:latest`
3. Run `podman compose up` as usual