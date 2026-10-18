# qubership-apihub-build-task-consumer

Node.js microservice for APIHUB Package versions builds.

This microservice is REST API and task management wrapper for [qubership-apihub-api-processor](https://github.com/Netcracker/qubership-apihub-api-processor) library.

Delievered as a Docker image and included into Qubership-APIHUB delivery as a mandatory part.

So please refer to [qubership-apihub](https://github.com/Netcracker/qubership-apihub) application repository for end-to-end installation details.

## Installation

Not from here, and not with npm. This component is a member of the pnpm workspace, so it has
no install of its own — dependencies are resolved once, at the workspace root, from the single
`pnpm-lock.yaml`:

```bash
pnpm install          # at the workspace root, not in this directory
```

Running `npm install` here would write a `package-lock.json` and a flat `node_modules` beside
this manifest, resolve the `workspace:` specifiers against the registry rather than the sibling
packages, and give this component a second, disagreeing set of versions. That is the shape the
monorepo exists to remove.

## Building the app locally

No `.npmrc` and no GitHub PAT are needed any more. Nothing is fetched from a registry at
image-build time; the image is assembled from output you have already built.

```bash
pnpm install                                    # once, at the workspace root
pnpm exec nx build build-task-consumer
pnpm deploy --filter=./frontend/build-task-consumer --prod \
            frontend/build-task-consumer/.deploy
cd frontend/build-task-consumer && podman build -f Dockerfile.local .
```

The `pnpm deploy` step is the one prerequisite and it cannot be dropped. This image used to
run `npm ci` inside itself against a per-component `npm-shrinkwrap.json`; the workspace has
one lockfile at the root, that shrinkwrap is gone, and the internal dependencies are
`workspace:` specifiers that no in-image install can resolve. `pnpm deploy --prod` produces a
production-only tree with those specifiers already resolved, and it has to run where the
workspace is. See the header of `Dockerfile.local` for why it is not simply moved inside the
image — briefly: it would restore the QEMU-emulated install that made this the slowest image
by a factor of three.

**On Windows** `pnpm deploy` may fail with `EPERM` renaming its temporary directory into
place — a handle held over the thousands of files just written, usually a virus scanner. It is
reliable on Linux. Build this image in CI or WSL if that happens.

### Production Docker image (locally)

The production `Dockerfile` takes the **workspace root** as its context and needs no build
secret, because it pulls nothing from a registry:

```bash
pnpm exec nx build build-task-consumer
pnpm deploy --filter=./frontend/build-task-consumer --prod .deploy/build-task-consumer
podman build -f frontend/build-task-consumer/Dockerfile .     # from the workspace root
```

That is the command CI runs. `Dockerfile.local` exists because the same build from this
directory is shorter and has no workspace-root paths in it; the two differ only in where the
inputs come from.

## Running the app

`pnpm run`, not `npm run` — and this is not a spelling preference. Under
`nodeLinker: isolated` a script that shells out to `npm` gets npm's flat resolution instead of
pnpm's, and npm also reads the workspace's pnpm settings and warns about every one it does not
recognise. The migration rewrote the whole fleet's scripts for this reason; the prose here was
missed.

Two of the three lines were also not valid npm in the first place — `npm start:dev` is not a
command; it would have to be `npm run start:dev`. Only `start` may be run bare, and pnpm
accepts all three the same way.

```bash
# development
$ pnpm start

# watch mode
$ pnpm start:dev

# production mode
$ pnpm start:prod
```

## Which image tag CI publishes

The branch decides the floating tag; the content decides the immutable one.

| branch | floating tag |
|---|---|
| `develop` | `:dev` |
| `release` | `:next` |
| `main` | `:latest` |

Every build pushes `:src-<hash>`, derived from the git tree hashes of this project and its
transitive dependencies plus the Dockerfile, `.dockerignore` and the lockfile. That is the only
tag a build writes. The floating tag is applied afterwards as an alias of it, on every run,
whether or not anything was built — so a build whose `src-` tag already exists is skipped and
costs about a second.

The image jobs are not gated on `nx affected`. Whether a floating tag points at the right image
is a fact about the registry, and `affected` only knows what changed between two commits, so a
branch on which nothing changed would otherwise keep a stale pointer forever.

## Where the provenance lives

Not in the image. `GIT_BRANCH` and `GIT_HASH` used to be baked in as environment variables and
were removed, because a ref is not a property of the content. Two branches at one commit hash
identically, so they share a `src-` tag, and the branch tag is published by retagging rather
than rebuilding — which meant the image serving `:dev` reported `GIT_BRANCH=main`.

The ref and commit are now OCI annotations on the index that each branch tag points at, which
is per-tag and can therefore be true for every tag at once:

```bash
docker buildx imagetools inspect ghcr.io/netcracker/apihub-build-task-consumer:dev
```

`org.opencontainers.image.version` is the ref and `org.opencontainers.image.revision` the
commit. The trade is that `echo $GIT_BRANCH` inside a running container no longer answers the
question; the command above does, and it answers for the tag you actually pulled.
