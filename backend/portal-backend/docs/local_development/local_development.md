# Local Backend development

This instruction tells how to set up local development.  

Backends (Apihub and Custom service) could be started from IDE/cmd.

DB and frontend components in docker are required to run full Apihub application except the agent functionality.
There's no way for start agent in docker since k8s API is required.

## Prerequisites

### Software installation

Install necessary software if it was not installed earlie. For more info please see [Newcomer environment setup](../newcomer_env_setup.md)

### DB

Run corresponding docker-compose file from /docker-compose/DB folder.
It will start Postgres DB in docker container with predefined credentials and database. So it's ready to connect from Apihub BE.

At this moment there's no procedure to create NC service DB in one command, so you have to create DB `apihub_nc` manually.
If you use DBeaver you need to connect to PostgreSQL DB first using parameters:
```
Host=localhost
Username=apihub
Password=APIhub1234
Port=5432
```
Don't forget to check 'Show all databases' to see all DBs.
Then open postgres->Databases and create `apihub_nc` DB with owner 'apihub' (all other params leave as default).

* To create a corresponding docker image you need to issue a command:

```bash
docker-compose -f docs/local_development/docker-compose/DB/docker-compose.yml up
```

If you have another docker image (usually another DB container from another project) which could intersect with this one then you need to change PostgreSQL port settings and image port mapping in  [`DB/docker-compose.yml`](/docs/local_development/docker-compose/DB/docker-compose.yml). Please add two arguments into **command** section ("\-p" and "\<new port number\>") and update port mapping in the **ports** section. Default port number for PostgreSQL is **5433**.

* To run the image please issue a command below:

```bash
docker-compose -f docs/local_development/docker-compose/DB/docker-compose.yml run postgres
```

Of course, you can perform the actions above with your favorite IDE (Podman Desktop or Rancher Desktop for example).

Expected result - you will have a PostgreSQL instance running and waiting for a clients. If you do not please try to remove images, restart Docker (Podman Desktop or Rancher Desktop) and try again. If the application is unable to reach PostgreSQL then change you port settings, re-create image and try again.

## Running backends

### Apihub

Apihub backend is a product implementation which should be opensource-ready.

#### Generate private key

Apihub contains built-in identity provider and it requires RSA private key as a base secret.

Run [`generate_jwt_pkey.sh`](generate_jwt_pkey.sh), it will generate file jwt_private_key in the current directory. Paste the value to Apihub BE environment. Please mind that the key must be non-empty.

#### API hub BE environment

The following environment variables are required to start Apihub application:

```INI
LISTEN_ADDRESS=127.0.0.1:8090;
APIHUB_POSTGRESQL_DB_NAME=apihub;
APIHUB_POSTGRESQL_USERNAME=apihub;
APIHUB_POSTGRESQL_PASSWORD=APIhub1234;
APIHUB_POSTGRESQL_PORT=5432;
PRODUCTION_MODE=false;
JWT_PRIVATE_KEY={use generated key here}
```

Set these variables to build configuration.

#### Run API hub

You can simply run Service.go from apihub-service project or you can try to use [`Dockerfile`](/Dockerfile) at your choice. If you will try to use Dockerfile you have to know about the proper image URL which you need to change in the file.

### Post-setup

Since you will run non-production environment you do not have any valid identity instead of internal. You need to perform the actions below to configure internal user in the newly created environment:

* create local user via `POST /api/internal/users`
* add admin role via `POST /api/internal/users/{userId}/systemRole`
* get local user token via  `POST /api/v2/auth/local`

You can use any of test tools approved by company to send REST API requests. The best request collection can be found in the [`apihub-postman-collections repository`](https://<git_group_link>/apihub-postman-collections). And the command above, collection and environment for local development are also included.

You can use NC-newman-desktop or Bruno app to run REST API requests.

### Custom service

Custom service is an Apihub extension with custom logic.

### Create m2m token

Create m2m admin token via POST `/api/v2/packages/*/apiKeys`
Asterisk means that the token will work for any package

### Envs

```INI
LISTEN_ADDRESS=127.0.0.1:8091;
DB_TYPE=postgres;
APIHUB_POSTGRESQL_HOST=localhost;
APIHUB_POSTGRESQL_PORT=5432;
NC_APIHUB_POSTGRESQL_DB_NAME=apihub_nc;
NC_APIHUB_POSTGRESQL_USERNAME=apihub;
NC_APIHUB_POSTGRESQL_PASSWORD=APIhub1234;
APIHUB_URL=http://127.0.0.1:8090;
APIHUB_ACCESS_TOKEN={use generated token value here};
```

## FE


### Run frontend

Run corresponding docker-compose file from `/docker-compose/FE` folder.
It will start FE container providing you a kind of GUI on localhost:8080 that will connect to Apihub BE on :8090 and NC service on :8091.

To create a corresponding Docker image you need to issue a command:

```bash
docker compose -f docs/local_development/docker-compose/FE/docker-compose.yml up
```

If default port (8080) was already taken by another application or Docker image you have configure another one in the **ports** section an re-create image with the command above. See [`FE/docker-compose.yml`](/docs/local_development/docker-compose/FE/docker-compose.yml)

To run the image please issue a command below:

```bash
docker compose -f docs/local_development/docker-compose/FE/docker-compose.yml run apihub-ui
```

Of course, you can perform the actions above with your favorite IDE.

### Open web view

#### Create user
First you need to create a local user.
Open NC-newman-desktop or Bruno app and run `POST /api/internal/users` at APIHUB_HOST=localhost:8090 with body:

`{
"email":"test@mail.com",
"password":"test"
}`

#### Open web view
Go to http://localhost:8080 (use other port if you change it) and enter created above credentials.

#### Fill DB with data if needed
You can fill DB with data:
* download appropriate backup archive from FTP
* extract downloaded archive
* use Restore tool of you favorite application, dBeaver for example with next parameters: format: Directory, Backup file: <path to folder with extracted DB>, Discard object owner = true. 