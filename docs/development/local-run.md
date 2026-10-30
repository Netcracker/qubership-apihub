# Run APIHUB locally

Pick the setup by what you change:

| You want to | Use |
|---|---|
| try the product or reproduce a bug on a release | [Compose with published images](#compose-with-published-images) |
| test your change as images, without Kubernetes | [Compose with locally built images](#compose-with-locally-built-images) |
| test the Helm chart, the ingress, or the agent | [Kind quickstart](#kind-quickstart) |
| debug `portal-backend` | [Backend from the IDE, the rest in Compose](#backend-from-the-ide-the-rest-in-compose) |
| work on the Portal or Agents UI | [UI proxy mode](#ui-proxy-mode) |
| work on the builder or the Java worker | [Builder and Java worker](#builder-and-java-worker) |

Set up the workstation first with [Getting started](./getting-started.md). Breakpoints, logs, and test runs are in
[Debugging](./debugging.md). Every configuration knob is in the
[configuration reference](../configuration-reference.md).

## What you need

- Podman 5 with the compose plugin (`podman compose`). Docker with Compose v2 also works; the scripts call `podman`,
  so run `docker compose` yourself then. The Compose stacks rely on
  the `host.docker.internal` name, which Podman provides inside every container; with Docker Engine on Linux, add
  `extra_hosts: ["host.docker.internal:host-gateway"]` to the services that use it.
- On Windows: Git Bash or WSL for the scripts, and the line `127.0.0.1 host.docker.internal` in
  `C:\Windows\System32\drivers\etc\hosts`.
- `openssl` and `envsubst` (GNU gettext; Git for Windows ships both).
- For Kind: `kind`, `kubectl`, and `helm`.

## Compose with published images

The stack in [`deploy/docker-compose/apihub-generic/`](../../deploy/docker-compose/apihub-generic/) runs the
backend, the builder, the UI, the linter, the agents backend, and PostgreSQL. It has no agent: the agent needs a
Kubernetes API.

Its images use the tag `dev`, which follows `develop`. Change the tag to the one you need:

| Tag | Content |
|---|---|
| `dev` | `develop` |
| `next` | the release candidate on `release` |
| `latest` | the last release |
| `<version>` | one released version of the component |
| `feature-123-add-export` | a branch, after CI ran on it; see [image tags](./ci.md#image-tags) |

```bash
cd deploy/docker-compose/apihub-generic
sed -i 's/:dev$/:latest/' docker-compose.yml
sh generate_env_and_up_compose.sh
```

The script generates a JWT key, an admin login and password, and an access token, prints them, writes them into the
`.env` and `*-config.yaml` files **in place**, and runs `podman compose up`. Note the printed values: you log in
with them. Open <http://localhost:8081/login>.

| Port | Service |
|---|---|
| 8081 | UI: the Portal and the Agents UI |
| 8090 | backend REST API |
| 8091 | linter |
| 8092 | agents backend |
| 3000 | builder |
| 5432 | PostgreSQL (`postgres` / `postgres`) |
| 47375, 47376 | backend cache cluster ports |

Stop the stack with `podman compose down`. The database keeps its data in the container (`PGDATA=/pgdata`), so
`down` deletes it; the [stack README](../../deploy/docker-compose/apihub-generic/README.md) explains how to keep
it. Before you commit, undo the generated values with
`git restore .` in the folder: the files hold secrets now.

To start the stack again, use `podman compose up -d` instead of the script. A second run of the script prints new
values but cannot write them, because the placeholders are gone.

## Compose with locally built images

Build the image you changed, tag it, and point the stack at the tag. Build from the repository root after
`pnpm install`. The build contexts are the ones CI uses (`.github/workflows/ci.yml`):

```bash
# Go images: the build compiles the module inside the image.
podman build -f backend/portal-backend/Dockerfile -t localhost/qubership-apihub-backend:local backend
podman build -f backend/api-linter-service/Dockerfile -t localhost/qubership-api-linter-service:local backend
podman build -f backend/agents-backend/Dockerfile -t localhost/qubership-apihub-agents-backend:local backend
podman build -f backend/agent/Dockerfile -t localhost/qubership-apihub-agent:local backend/agent

# UI: the image copies the dist folders of both apps.
pnpm exec nx run-many -t build -p ui-portal,ui-agents
podman build -f frontend/ui/Dockerfile -t localhost/qubership-apihub-ui:local .

# Builder: the image copies dist/ and a production node_modules written by pnpm deploy.
pnpm exec nx build build-task-consumer
pnpm deploy --filter=./frontend/build-task-consumer --prod .deploy/build-task-consumer
podman build -f frontend/build-task-consumer/Dockerfile -t localhost/qubership-apihub-build-task-consumer:local .

# Java worker: the image copies the shaded jar that Maven writes.
pnpm exec nx run java-task-consumer:build
podman build -t localhost/qubership-apihub-java-task-consumer:local backend/java-task-consumer
```

The root `.dockerignore` admits only the paths that the UI and builder images copy, so build those projects with Nx
first. On Windows, `pnpm deploy` can fail with `EPERM` while a virus scanner holds the files it has just written;
build the builder image in WSL then.

Then change the `image:` line of that service in `docker-compose.yml`, for example:

```yaml
    qubership-apihub-backend:
        image: localhost/qubership-apihub-backend:local
```

Run `podman compose up -d` again. Compose recreates only the services whose configuration changed. After you rebuild
under the same tag, recreate the service with `podman compose up -d --force-recreate <service>`.

## Kind quickstart

[`deploy/helm-templates/local-k8s-quickstart/`](../../deploy/helm-templates/local-k8s-quickstart/README.md) installs
the product chart on a local Kind cluster with an ingress controller, PostgreSQL, and a local TLS certificate. Run it
from its own folder, because the script changes into `./scripts`:

```bash
cd deploy/helm-templates/local-k8s-quickstart
export KIND_EXPERIMENTAL_PROVIDER=podman   # only with Podman
./apihub-quickstart.sh
```

The cluster publishes ports 80 and 443, so stop anything that holds them first. The Portal is at
<https://qubership-apihub.localtest.me/login>; the credentials are in `qubership-apihub/local-secrets.yaml`. The
values file `qubership-apihub/local-k8s-values.yaml` deploys the `dev` images.

To run your own image, load it into the cluster node and upgrade the release. Use a tag other than `latest`: the
chart sets no pull policy for most images, so Kubernetes pulls a `latest` image from the registry every time and
ignores the loaded one.

With Docker:

```bash
kind load docker-image localhost/qubership-apihub-backend:local
```

With Podman, `kind load docker-image` does not see Podman's images (it calls `docker`), so save an archive and load
that:

```bash
podman save -o backend.tar localhost/qubership-apihub-backend:local
kind load image-archive backend.tar
```

Then point the release at the image, still from `local-k8s-quickstart`:

```bash
helm upgrade apihub ../qubership-apihub -n qubership-apihub \
  -f qubership-apihub/local-k8s-values.yaml -f qubership-apihub/local-secrets.yaml \
  --set qubershipApihubBackend.image.repository=localhost/qubership-apihub-backend \
  --set qubershipApihubBackend.image.tag=local
./scripts/6-patch-apihub-hosts.sh
```

The value keys of the other images are `qubershipApihubUi`, `qubershipApihubBuildTaskConsumer`,
`qubershipApiLinterService`, and `qubershipApihubAgentsBackend`. After you load a rebuilt image under the same tag,
restart the deployment: `kubectl rollout restart deployment/qubership-apihub-backend -n qubership-apihub`.

The agent has its own chart in [`backend/agent/helm-templates/`](../../backend/agent/helm-templates/). Remove the
cluster with `kind delete cluster`.

## Backend from the IDE, the rest in Compose

Run `portal-backend` from the IDE with breakpoints while the generic stack provides PostgreSQL, the UI, the builder,
the linter, and the agents backend.

1. Start the generic stack as in [Compose with published images](#compose-with-published-images), then stop its
   backend. The ports 8090, 47375, and 47376 must be free for your process.

   ```bash
   podman compose stop qubership-apihub-backend
   ```

2. Point the UI at the host: in `qubership-apihub-ui.env`, set `APIHUB_BACKEND_ADDRESS` and
   `APIHUB_NC_SERVICE_ADDRESS` to `host.docker.internal:8090`, then run
   `podman compose up -d qubership-apihub-ui`. The builder already calls `host.docker.internal:8090`.
3. Make a config folder outside the repository, for example `~/apihub-local/`, and copy the stack's filled
   `qubership-apihub-backend-config.yaml` there as `config.yaml`. Set the database host to `localhost` and add a
   `technicalParameters` section:

   ```yaml
   database:
     host: 'localhost'
     # port, name, username, and password stay as they are
   technicalParameters:
     listenAddress: ':8090'
     apiSpecDirectory: './docs/api'
   ```

   The `extensions` entries call the linter and the agents backend at `host.docker.internal:8091` and `:8092`. That
   name resolves on the host only through the Windows `hosts` entry from [What you need](#what-you-need); on Linux,
   change it to `localhost`.

   Keep `zeroDayConfiguration.accessToken`: the builder, the linter, and the agents backend use the same token.
   The full list of keys is in [`config.template.yaml`](../../backend/portal-backend/config.template.yaml).
4. Run `main.go` of `backend/portal-backend` with the working directory `backend/portal-backend` and the environment
   variable `APIHUB_CONFIG_FOLDER` set to the config folder. The working directory matters: the migrations and the
   static assets are found relative to it. The IDE settings are in
   [Debugging: Go service](./debugging.md#go-service).
5. Open <http://localhost:8081/login>. The backend answers on <http://localhost:8090>.

`security.productionMode` stays `false` in this config, which enables local login and the internal user endpoints.

The [`backend-debug` stack](../../deploy/docker-compose/backend-debug/README.md) is the older variant of this recipe.
It uses `network_mode: host`. On Windows and macOS, the host network of a container is the network of the Podman
machine, not of your computer, so the containers cannot reach a backend that runs in your IDE. On Linux it works, and
its README shows the `config.yaml` and the launch configuration. Prefer the steps above elsewhere.

## UI proxy mode

Proxy mode runs the Portal from your sources with hot reload and forwards `/api`, `/api-linter`, `/agents-backend`,
and `/playground` to a running APIHUB. It is the default setup for UI work. The details are in
[`frontend/ui/docs/dev/local-development.md`](../../frontend/ui/docs/dev/local-development.md).

1. Build the Portal and its workspace dependencies once. The dev server loads libraries such as `api-processor` from
   their `dist/` folders.

   ```bash
   pnpm exec nx build ui-portal
   ```

2. Set `proxyServer` in `frontend/ui/packages/portal/vite.config.ts` to the APIHUB you want. The default,
   `http://host.docker.internal:8081`, is the UI of the local Compose stack; it stays the same when the backend runs
   from the IDE as described above. Point it at a UI or an ingress, not at the backend port: the UI nginx forwards
   the extension prefixes such as `/api-linter` to their services.
3. Start Vite from the Portal package:

   ```bash
   cd frontend/ui/packages/portal
   pnpm dev:proxy
   ```

4. Open the URL that Vite prints (port 5173 unless it is taken). It opens `/login`; log in with the credentials of
   that APIHUB.

After you change a library, rebuild it (`pnpm exec nx build <library>`) and restart `pnpm dev:proxy`. The Agents UI
has the same script in `frontend/ui/packages/agents`, with its own `proxyServer` constant.

`pnpm dev:proxy:msw` adds the Mock Service Worker handlers. The mixed mode, a local mock server for selected `/api`
prefixes, is described in [`portal-mock-server.md`](../../frontend/ui/docs/dev/portal-mock-server.md).

### No replacement for `dev:portal` and `dev:agents` yet

The UI repository had two root scripts, `dev:portal` and `dev:agents`, which used lerna to start the mock backend
and the Vite dev server of one app together. The monorepo has no lerna and no replacement script yet. Run the two
scripts in two terminals instead:

```bash
cd frontend/ui/packages/agents
pnpm dev:backend     # terminal 1: the mock backend on port 3003 (NODEJS_PORT)
pnpm dev:frontend    # terminal 2: Vite
```

The same pair exists in `frontend/ui/packages/portal`, but the Portal does not work against the mock alone: most
Portal flows need a real backend. For the Portal, use proxy mode.

## Builder and Java worker

### Builder (`build-task-consumer`)

The builder polls the backend for build tasks; it takes no inbound calls from the backend. Run it from the sources
against any backend:

```bash
pnpm exec nx build build-task-consumer
cd frontend/build-task-consumer
APIHUB_BACKEND_ADDRESS=localhost:8090 APIHUB_API_KEY=<access-token> pnpm start:dev
```

`APIHUB_API_KEY` must equal `zeroDayConfiguration.accessToken` of the backend. The builder listens on port 3000; if
the Compose stack runs, stop its builder first (`podman compose stop qubership-apihub-build-task-consumer`), or
both take tasks. `pnpm start:dev` rebuilds on change; to pick up a change in `api-processor`, rebuild that library.

### Java worker (`java-task-consumer`)

The Java worker polls a libraries backend that is not part of the product yet, so it does not join the Compose
stack. Run it against the in-process queue of its debug harness, described in
[`backend/java-task-consumer/docs/local-debug.md`](../../backend/java-task-consumer/docs/local-debug.md) and in
[Debugging: Java worker](./debugging.md#java-worker). To run the jar itself:

```bash
pnpm exec nx run java-task-consumer:build
APIHUB_BACKEND_ADDRESS=localhost:8080 APIHUB_API_KEY=<access-token> \
  java -jar backend/java-task-consumer/java-task-consumer/target/java-task-consumer-*.jar
```

The jar polls `APIHUB_BACKEND_ADDRESS` for tasks. Its health endpoint is `GET http://localhost:3000/live`.
