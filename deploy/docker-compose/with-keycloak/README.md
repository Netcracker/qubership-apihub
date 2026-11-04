# APIHUB docker-compose local deployment with SAML integration via Keycloak

This stack is the [generic stack](../apihub-generic/README.md) plus Keycloak with SAML and OIDC sign-in. This page
describes the Keycloak delta; the prerequisites, ports, and persistence are the same as in the generic README and in the
[installation guide](../../../docs/installation-guide.md#docker-compose).

The `docker-compose.yml` file in this folder runs all APIHUB containers, PostgreSQL, and a Keycloak server that is
configured for SAML and OIDC.

## Prerequisites

Install **podman** with **compose** plugin.

Optional: For PostgreSQL access install PGADmin or any other similar tool.

**NOTE:** WA for Windows and podman required: you need to add the following line into your `hosts` file: `127.0.0.1 host.docker.internal`

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
  externalIdentityProviders:
    - id: 'external-saml-idp'
      displayName: 'SAML'
      imageSvg: ''
      protocol: 'SAML'
      samlConfiguration:
        # <Keycloak SAML metadata endpoint. Default value is fine as soon as Keycloak with 0-Day configuration is set up within current compose file>
        metadataUrl: 'http://host.docker.internal:8082/realms/apihub-1/protocol/saml/descriptor'
        # <Keycloak SAML certificate. Must be manually generated. Or provided by startup script>
        certificate: ${SAML_CRT} 
        # <Keycloak SAML certificate private key. Must be manually generated. Or provided by startup script>
        privateKey: ${SAML_KEY}
    - id: 'external-oidc-idp'
      displayName: 'OpenID Connect'
      imageSvg: ''
      protocol: 'OIDC'
      oidcConfiguration:
        providerUrl: 'http://host.docker.internal:8082/realms/apihub-2'
        clientId: 'apihub-oidc'
        clientSecret: ${OIDC_CLIENT_SECRET}
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

```text
keycloak/realm.json  --->

"baseUrl": "http://host.docker.internal:8081", // change 8081 to 5173 if you are working on proxy FE application
...
"saml.signing.certificate": "${SAML_CRT_KEYCLOAK}",   //see NOTE2 below
...
"saml.signing.private.key": "${SAML_KEY_KEYCLOAK}",   //see NOTE2 below
...
"username": "${APIHUB_USER_USERNAME}",  //Login for local Keycloak user to be used for login to APIHUB via Keycloak
...
"value": "${APIHUB_USER_PASSWORD}"      //Password for local Keycloak user to be used for login to APIHUB via Keycloak

```

For database access connect to localhost:5432 postgres/postgres

**NOTE:** you can use `generate_jwt_pkey.sh` script for generation a value for JWT_PRIVATE_KEY

**NOTE2:** about `SAML_CRT`, `SAML_KEY`, `SAML_CRT_KEYCLOAK` and `SAML_KEY_KEYCLOAK`. You need to generate private key and self-signed certificate in PEM format. For `SAML_CRT` and `SAML_KEY` provide base64 encoded values. For `SAML_CRT_KEYCLOAK` and `SAML_KEY_KEYCLOAK` provide original values but with removed first and last lines and removed `\n`

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

Run `sh generate_env_and_up_compose.sh` from this folder. It generates the required values,
**prints them (here you can see the user and password for login)**, writes them into the files in place, and
starts APIHUB.

## Usage

<http://host.docker.internal:8081/> - the APIHUB UI

You will be able to login under user/user credential (set in ./keycloak/realm.json)

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

3. Restart Podman machine
4. Restart your PC
