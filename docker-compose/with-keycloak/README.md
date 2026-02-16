# APIHUB docker-compose local deployment with SAML integration via Keycloak

Follow this guide in order to run APIHUB on a local machine/bare-metal server using Docker (or compatible) container runtime

`docker-compose` file in this folder runs all qubership-apihub containers and their mandatory startup dependency - PostgreSQL database. At the same time it set up Keycloak and SAML integration for Auth for Qubserhip-APIHUB

## Prerequisites

Install **podman** with **compose** plugin.

Optional: For PostgreSQL access install PGADmin or any other similar tool.

**NOTE:** WA for Windows and podman required: you need to add the following line into your `hosts` file: `127.0.0.1 host.docker.internal`

## Parameters setup

Review *.env and *config.yaml files in this folder and fill values for the following ones:

```
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

```
qubership-apihub-build-task-consumer.env --->

# <put_your_key_here - any random string. Must be the same as APIHUB_ACCESS_TOKEN in BE>
APIHUB_API_KEY=${APIHUB_ACCESS_TOKEN}
```


```
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

**NOTE2:** about `SAML_CRT`, `SAML_KEY`, `SAML_CRT_KEYCLOAK` and `SAML_KEY_KEYCLOAK`. You need to generate private key and self-signed certificate in PEM format. For `SAML_CRT` and `SAML_KEY` provide base64 encoded values. For `SAML_CRT_KEYCLOAK` and `SAML_KEY_KEYCLOAK` provide orignial values but with removed first and last lines and removed `\n`

## Start

Execute `podman compose up`

## Stop

Execute `podman compose down`

## Run via single command

Execute `generate_env_and_up_compose.sh` - it will initialize all require ENV VARs, **print them to the output (here you can see user/password for login)** and start the Qubership-APIHUB application


## Usage

http://host.docker.internal:8081/ - Qubserhip-APIHUB UI URL

You will be able to login under user/user credential (set in ./keycloak/realm.json)

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
3. Restart Podman machine
4. Restart your PC