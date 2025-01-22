# qubership-apihub-build-task-consumer

NodeJS microservice for APIHUB Package versions builds.

## Installation

```bash
$ npm
```

## Building the app locally

```bash
npm install
npm run build
```

For build docker image rename file `Dockerfile.local` -> `Dockerfile` and execute

```bash
podman build .
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
