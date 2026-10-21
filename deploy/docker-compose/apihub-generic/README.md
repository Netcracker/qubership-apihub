# APIHUB docker-compose local deployment

Follow this guide to run APIHUB on a local machine or bare-metal server with Docker or a compatible container runtime.

The `docker-compose.yml` file in this folder runs all APIHUB containers and their only mandatory dependency, the
PostgreSQL database. The [installation guide](../../../docs/installation-guide.md#docker-compose) covers ports, the
JWT key, and the placeholder substitution, and the [configuration reference](../../../docs/configuration-reference.md)
lists every setting. The Keycloak variant is in [`../with-keycloak`](../with-keycloak/README.md).

## Prerequisites

Install **podman** with **compose** plugin.

Optional: For PostgreSQL access install PGADmin or any other similar tool.

## Parameters setup

Review `.env` and `config.yaml` files in this folder and fill values for the following ones:

```text
qubership-apihub-backend-config.yaml --->

security:
...
  jwt:
    # <put_your_key_here - ssh private key base64 encoded>
    privateKey: ${JWT_PRIVATE_KEY}
...
zeroDayConfiguration:
  # <access_token, example: 1RnECckUUB>
  accessToken: ${APIHUB_ACCESS_TOKEN}
  # <admin_login, example: apihub>
  adminEmail: ${APIHUB_ADMIN_EMAIL}
  # <admin_password, example: password>
  adminPassword: ${APIHUB_ADMIN_PASSWORD}
```

```text
qubership-apihub-build-task-consumer.env --->

# <put_your_key_here - any random string. Must be the same as APIHUB_ACCESS_TOKEN in BE>
APIHUB_API_KEY=${APIHUB_ACCESS_TOKEN}
```

For database access connect to localhost:5432 postgres/postgres

NOTE: you can use `generate_jwt_pkey.sh` script for generation a value for JWT_PRIVATE_KEY

### Optional: custom CA for backend HTTPS

If the backend image is based on [qubership-core-base](https://github.com/Netcracker/qubership-core-base-images),
place corporate CA files (`.crt`, `.cer`, or `.pem`) in **`certs/`** and uncomment **`./certs:/tmp/cert:ro`** in
**`docker-compose.yml`** for **`qubership-apihub-backend`**, **`qubership-api-linter-service`**, and
**`qubership-apihub-agents-backend`**. MinIO/S3 CA stays in **`s3Storage.crt`** in the backend config YAML.

## Start

Execute `podman compose up`

## Stop

Execute `podman compose down`

## Run via single command

Run `sh generate_env_and_up_compose.sh` from this folder. It generates the required values, prints them, writes them
into the `.env` and `config.yaml` files in place, and starts APIHUB. Run `git restore .` in this folder before you
commit.

## Usage

<http://localhost:8081/login> - the APIHUB UI

## Startup with locally built images

To start the stack with an image you built from this repository, build the image, change its `image` URI in
`docker-compose.yml` to the local tag (for example `localhost/qubership-apihub-backend:local`), and run
`podman compose up`. The build commands for each module are in the
[local run guide](../../../docs/development/local-run.md#compose-with-locally-built-images).

## How to make Postgres data be persistent

1. Remove or comment the following line in `docker-compose.yml` file: `- PGDATA=/pgdata`
2. Remove `.gitkeep` file from `./data` directory

On Linux it is enough.

On Windows need to tune WSL:

**NOTE** for `Podman` only

1. Go to Podman desktop, open Podman machine terminal
2. Edit file '/etc/wsl.conf' (using sudo)
   Add the following lines to the end:

   ```text
   [automount]
   options = "metadata"
   ```

   One-liner to do it: `echo -e "\n[automount]\noptions = "metadata"" | sudo tee -a /etc/wsl.conf`

3. Restart your PC (restart of WSL only is not enough)
