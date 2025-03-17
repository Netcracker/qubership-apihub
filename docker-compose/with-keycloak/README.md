# APIHUB docker-compose local deployment with SAML integration via Keycloak

Follow this guide in order to run APIHUB on a local machine/bare-metal server using Docker (or compatible) container runtime

`docker-compose` file in this folder runs all qubership-apihub containers and their mandatory startup dependency - PostgreSQL database. At the same time it set up Keycloak and SAML integration for Auth for Qubserhip-APIHUB

## Prerequisites

Install **podman** with **compose** plugin.

Optional: For PostgreSQL access install PGADmin or any other similar tool.

**NOTE:** WA for Windows and podman required: you need to add the following line into your `hosts` file: `127.0.0.1 host.docker.internal`

**NOTE2:** as soon as apihub does not support https out of the box - SAML integration will not work. As a WA you need to change `SamlAuthController.go` as shown below.

```
	http.SetCookie(w, &http.Cookie{
		Name:     "userView",
		Value:    cookieValue,
		MaxAge:   int((time.Hour * 12).Seconds()),
		Secure:   true,    --> false,
		HttpOnly: false,
		Path:     "/",
	})
```

Also you can use prebuilt backend image tag `sso`.

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

# <put_your_cert_here - SAML provider's PEM certificate base64 encoded>
SAML_CRT=${SAML_CRT}

# <put_your_key_here - SAML provider's PEM certificate's private key base64 encoded>
SAML_KEY=${SAML_KEY}
```

```
qubership-apihub-build-task-consumer.env --->

# <put_your_key_here - any random string. Must be the same as APIHUB_ACCESS_TOKEN in BE>
APIHUB_API_KEY=${APIHUB_ACCESS_TOKEN}
```


```
keycloak/realm.json  --->

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

You will be able to login under user/user credential (set in ./keycloack/realm.json)

## Startup with locally built images

If you want to start APIHUB via compose with locally build docker image of any module you need to do the following:

1. Build module repository (ex: qubership-apihub-backend) by executing its build.cmd/sh
2. Change `image` URI in docker-compose.yml from `ghcr.io/netcarcker/qubership-apihub-backend:latest` to `localhost/netcracker/qubership-apihub-backend:latest`
3. Run `podman compose up` as usual