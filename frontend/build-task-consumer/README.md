# APIHUB build task consumer

The build task consumer is the builder of APIHUB: a NestJS service that builds package versions. It polls the backend
for build tasks, runs the [api-processor](../api-processor/README.md) library on them, and reports the results back.
It takes no inbound calls from the backend. The module ships the image `qubership-apihub-build-task-consumer`, which
is a mandatory part of the product.

It is the build worker of the processing pipeline; see the
[architecture overview](../../docs/architecture/overview.md) and the
[build process](../../docs/architecture/build-process.md).

## Build, test, and lint

The Nx project is `build-task-consumer`. Dependencies are resolved once at the repository root: run `pnpm install`
there, never `npm install` in this folder, which would write a second lock file and resolve `workspace:` ranges
from the registry. Use `pnpm run`, not `npm run`: under `nodeLinker: isolated` a script that calls `npm` gets
npm's flat resolution.

```bash
pnpm exec nx run build-task-consumer:build
pnpm --filter @netcracker/qubership-apihub-build-task-consumer run lint
```

The Jest script is named `test:fixme`, so there is no Nx `test` target.
[Build and test](../../docs/development/build-and-test.md) covers the Nx commands.

### Docker image

The image is assembled from output you have already built; nothing is fetched from a registry at image-build time, and
no `.npmrc` or token is needed. From the repository root:

```bash
pnpm exec nx build build-task-consumer
pnpm deploy --filter=./frontend/build-task-consumer --prod .deploy/build-task-consumer
podman build -f frontend/build-task-consumer/Dockerfile .
```

This is the command CI runs; the production `Dockerfile` takes the workspace root as its context. The `pnpm deploy`
step cannot be dropped: the internal dependencies are `workspace:` ranges that no in-image install can resolve, and
`pnpm deploy --prod` writes a production tree with them resolved. It has to run where the workspace is. Installing
inside the image instead would bring back the QEMU-emulated install that made this the slowest image to build.

**On Windows**, `pnpm deploy` can fail with `EPERM` while renaming its temporary directory, because a virus scanner
holds the thousands of files it has just written. It is reliable on Linux: build the image in WSL or CI if it happens.

For a shorter local build, `Dockerfile.local` builds from this folder with no workspace-root paths. The two differ only
in where the inputs come from:

```bash
pnpm install
pnpm exec nx build build-task-consumer
pnpm deploy --filter=./frontend/build-task-consumer --prod frontend/build-task-consumer/.deploy
cd frontend/build-task-consumer && podman build -f Dockerfile.local .
```

## Run and debug locally

```bash
cd frontend/build-task-consumer
APIHUB_BACKEND_ADDRESS=localhost:8090 APIHUB_API_KEY=<access-token> pnpm start:dev
```

`pnpm start` runs once, `pnpm start:dev` rebuilds on change, and `pnpm start:prod` runs the compiled build. The
service listens on port 3000. The key must equal `zeroDayConfiguration.accessToken` of the backend, and a builder from
the Compose stack must be stopped first, or both take tasks. See
[Run APIHUB locally: Builder](../../docs/development/local-run.md#builder-and-java-worker) and
[Debugging: Builder](../../docs/development/debugging.md#builder).

## Configuration

The service reads environment variables; it has no config file.

| Variable | Purpose |
|----------|---------|
| `APIHUB_BACKEND_ADDRESS` | Backend host and port to poll |
| `APIHUB_API_KEY` / `APIHUB_API_KEY_FILE` | System API key, or a file that holds it |
| `JOB_REQUEST_INTERVAL` / `JOB_STATUS_INTERVAL` | Poll and status intervals |
| `OPERATIONS_BUILD_BATCH` | Batch size of the operations build |
| `port` | HTTP port; defaults to 3000 |

The [configuration reference](../../docs/configuration-reference.md) has the deployment view.

## API specifications

The REST API of the service is described in [`docs/REST API.yaml`](<docs/REST API.yaml>). Sample requests are in
[`rest-collections/`](rest-collections/).

## Further reading

- [api-processor](../api-processor/README.md): the library that does the work
- [Processing libraries](../../docs/architecture/processing-libraries.md)

## Which image tag CI publishes

The branch decides the floating tag; the content decides the immutable one.

| branch | floating tag |
|---|---|
| `develop` | `:dev` |
| `release` | `:next` |
| `main` | `:latest` |

Every build pushes `:src-<hash>`, derived from the Git tree hashes of this project and its
transitive dependencies plus the Dockerfile, `.dockerignore` and the lockfile. That is the only
tag a build writes. The floating tag is applied afterwards as an alias of it, on every run,
whether or not anything was built — so a build whose `src-` tag already exists is skipped and
costs about a second.

The image jobs are not gated on `nx affected`. Whether a floating tag points at the right image
is a fact about the registry, and `affected` only knows what changed between two commits, so a
branch on which nothing changed would otherwise keep a stale pointer forever.

## Where the provenance lives

Not in the content image. `GIT_BRANCH` and `GIT_HASH` used to be baked in at build time, which made the image
serving `:dev` report `GIT_BRANCH=main`: a ref is not a property of the content. Two branches at one commit hash
identically and share a `src-` tag.

The branch tag adds them in a thin layer on top of the content image (`tools/ci/ref-overlay`, environment variables
only), so every tag reports its own branch and short commit. The full commit and the ref are also OCI annotations on
the index that each branch tag points at:

```bash
docker buildx imagetools inspect ghcr.io/netcracker/apihub-build-task-consumer:dev
```

`org.opencontainers.image.version` is the ref and `org.opencontainers.image.revision` the commit.
