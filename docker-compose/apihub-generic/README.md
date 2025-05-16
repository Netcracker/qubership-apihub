# APIHUB docker-compose local deployment

Follow this guide in order to run APIHUB on a local machine/bare-metal server using Docker (or compatible) container runtime

`docker-compose` file in this folder runs all qubership-apihub containers and their only mandatory startup dependency - PostgreSQL database

## Prerequisites

Install **podman** with **compose** plugin.

Optional: For PostgreSQL access install PGADmin or any other similar tool.

## Parameters setup

Review *.env files in this folder and fill values for the following ones:

```
qubership-apihub-backend.env --->

# <put_your_key_here - ssh private key base64 encoded>
JWT_PRIVATE_KEY=${JWT_PRIVATE_KEY}

# <admin_login, example: apihub>
APIHUB_ADMIN_EMAIL=${APIHUB_ADMIN_EMAIL}

# <admin_password, example: password>
APIHUB_ADMIN_PASSWORD=${APIHUB_ADMIN_PASSWORD}

# <put_your_key_here - any random string>
APIHUB_ACCESS_TOKEN=${APIHUB_ACCESS_TOKEN}
```

```
qubership-apihub-build-task-consumer.env --->

# <put_your_key_here - any random string. Must be the same as APIHUB_ACCESS_TOKEN in BE>
APIHUB_API_KEY=${APIHUB_ACCESS_TOKEN}
```

For database access connect to localhost:5432 postgres/postgres

NOTE: you can use `generate_jwt_pkey.sh` script for generation a value for JWT_PRIVATE_KEY

## Start

Execute `podman compose up`

## Stop

Execute `podman compose down`

## Run via single command

Execute `generate_env_and_up_compose.sh` - it will initialize all require ENV VARs, print them to the output and start the Qubership-APIHUB application

## Usage

http://localhost:8081/login - Qubserhip-APIHUB UI URL

## Startup with locally built images

If you want to start APIHUB via compose with locally build docker image of any module you need to do the following:

1. Build module repository (ex: qubership-apihub-backend) by executing its build.cmd/sh
2. Change `image` URI in docker-compose.yml from `ghcr.io/netcarcker/qubership-apihub-backend:latest` to `localhost/netcracker/qubership-apihub-backend:latest`
3. Run `podman compose up` as usual

## How to make Postgres data be persistent

1. Remove or comment the following line in `docker-compose.yml` file: `- PGDATA=/pgdata`
2. Remove `.gitkeep` file from `./data` directory

On Linux it is enough.

On Windows need to tune WSL:

**NOTE** for `Podman` only

1. Go to Podman desktop, open Podman machine terminal
2. Edit file '/etc/wsl.conf' (using sudo)
Add the following lines to the end:

```
[automount]
options = "metadata"
```
One liner to do it: `echo -e "\n[automount]\noptions = "metadata"" | sudo tee -a /etc/wsl.conf`

3. Restart your PC (restart of WSL only is not enough)


