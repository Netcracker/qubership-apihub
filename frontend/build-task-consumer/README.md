# qubership-apihub-build-task-consumer

Node.js microservice for APIHUB Package versions builds.

This microservice is REST API and task management wrapper for [qubership-apihub-api-processor](https://github.com/Netcracker/qubership-apihub-api-processor) library.

Delievered as a Docker image and included into Qubership-APIHUB delivery as a mandatory part.

So please refer to [qubership-apihub](https://github.com/Netcracker/qubership-apihub) application repository for end-to-end installation details.

## Installation

```bash
npm install
```

## Building the app locally

Modify `.npmrc` file by adding GitHub PAT (personal access token) with access to `read packages`.

The file content sample:

```text
@netcracker:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=ghp_XYZ
always-auth=true
```

```bash
npm install
npm run build
podman build -f Dockerfile.local .
```

### Production Docker image (locally)

Uses the same `.npmrc` as above. The production `Dockerfile` does not copy it into the image; pass it as a build secret:

```bash
podman build --secret id=npmrc,src=.npmrc .
```

Optional: `--build-arg TAG=<version>` (default is `dev`) to select the published package version from GitHub Packages.

## Running the app

```bash
# development
$ npm start

# watch mode
$ npm start:dev

# production mode
$ npm start:prod
```
