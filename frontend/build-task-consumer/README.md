# qubership-apihub-build-task-consumer

NodeJS microservice for APIHUB Package versions builds.

This microservice is REST API and task management wrapper for [qubership-apihub-api-processor](https://github.com/Netcracker/qubership-apihub-api-processor) library.

Delievered as a Docker image and included into Qubership-APIHUB delivery as a mandatory part.

So please refer to [qubership-apihub](https://github.com/Netcracker/qubership-apihub) application repository for end-to-end installation details.

## Installation

```bash
$ npm
```

## Building the app locally

Modify `.npmrc` file by adding GitHub PAT (personal access token) with access to `read packages`.

The file content sample:

```
@netcracker:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=ghp_XYZ
always-auth=true
```

```bash
npm install
npm run build
podman build -f Dockerfile.local .
```


## Running the app

```bash
# development
$ npm start

# watch mode
$ npm start:dev

# production mode
$ npm start:prod
```


# API documentation

http://localhost:3000/api
