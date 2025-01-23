# qubership-apihub-build-task-consumer

NodeJS microservice for APIHUB Package versions builds.

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

## Test

```bash
# unit tests
$ npm test

# e2e tests
$ npm test:e2e

# test coverage
$ npm test:cov
```

# Documentation

http://localhost:3000/api
