# Debugging

How to stop at a breakpoint in each kind of module, and how to run one test suite against a local stack. Start the
stack you need with [Run APIHUB locally](./local-run.md); the build and test targets are in
[Build and test](./build-and-test.md).

## Go service

The Go services are `portal-backend`, `api-linter-service`, `agents-backend`, `agent`, and `test-service`, all in
one Go workspace (`go.work` at the repository root). The first four read `config.yaml` from a folder named by an
environment variable, and from the working directory when it is not set:

| Service | Folder variable | Config template |
|---|---|---|
| `portal-backend` | `APIHUB_CONFIG_FOLDER` | [`config.template.yaml`](../../backend/portal-backend/config.template.yaml) |
| `api-linter-service` | `LINTER_CONFIG_FOLDER` | [`config.template.yaml`](../../backend/api-linter-service/config.template.yaml) |
| `agents-backend` | `AGENTS_BACKEND_CONFIG_FOLDER` | [`config.template.yaml`](../../backend/agents-backend/config.template.yaml) |
| `agent` | `AGENT_CONFIG_FOLDER` | [`config.template.yaml`](../../backend/agent/config.template.yaml) |

`LOG_LEVEL` sets the initial log level (`debug`, `info`, and so on). The services read it from the environment, not
from `config.yaml`.

### Run under the debugger

Use the working directory of the module. `portal-backend` finds its migrations and static assets relative to it;
started elsewhere, it panics about missing migration files.

In VS Code with the Go extension, add a launch configuration:

```json
{
  "name": "portal-backend",
  "type": "go",
  "request": "launch",
  "mode": "debug",
  "program": "${workspaceFolder}/backend/portal-backend",
  "cwd": "${workspaceFolder}/backend/portal-backend",
  "env": {
    "APIHUB_CONFIG_FOLDER": "<path to the folder with config.yaml>",
    "LOG_LEVEL": "debug"
  }
}
```

In GoLand, create a **Go Build** configuration of the kind **Directory** with `backend/portal-backend`, set
**Working directory** to the same folder, and add the same environment variables.

From a terminal, start Delve headless and attach the IDE to port 2345:

```bash
cd backend/portal-backend
APIHUB_CONFIG_FOLDER=~/apihub-local dlv debug . --headless --listen=:2345 --api-version=2
```

The config for a backend that runs next to the Compose stack is in
[Run APIHUB locally](./local-run.md#backend-from-the-ide-the-rest-in-compose).

### Debug a Go test

```bash
cd backend/portal-backend
go test ./service/... -run TestName -v
dlv test ./service -- -test.run TestName
```

The Nx targets run the whole module: `pnpm exec nx run portal-backend:test`.

### What trips people up

[`backend/portal-backend/docs/running-and-probing.md`](../../backend/portal-backend/docs/running-and-probing.md)
lists the traps of a local `portal-backend` in detail. The ones you hit first:

- The cache binds ports 47375 and 47376 besides the HTTP port. With a second instance on the same ports the process
  answers `/live`, then exits about half a minute later. Stop the Compose backend before you start your own.
- `security.productionMode` defaults to `true`, and then the service refuses to start without an identity provider.
  Set it to `false` locally. Only then does the backend serve local login, the internal user endpoints, and
  `/debug/pprof/`.
- `/ready` answers 404 until the migrations finish. An unknown path answers 421, not 404.
- Panics and the logs of the cache and the database driver go to standard error, not to the log file. Keep standard
  error when a run "just stops".
- A system administrator can change the log level of a running service with
  `POST /api/v1/debug/logs/setLevel`.

## TypeScript library

The libraries (`api-processor`, `api-diff`, `api-unifier`, `ddlapi`, `json-crawl`, and the others under
`frontend/`) test with Jest. Run one file or one test from the library folder:

```bash
cd frontend/api-processor
pnpm exec jest test/api-kinds.test.ts -t "<part of the test name>"
```

A test that imports another workspace library loads it from that library's `dist/`, so build the dependencies first:
`pnpm exec nx run api-processor:test` does that through `dependsOn`.

To stop at a breakpoint, open a **JavaScript Debug Terminal** in VS Code and run the same command there, or start
Jest under the inspector and attach from the IDE or from `chrome://inspect`:

```bash
node --inspect-brk node_modules/jest/bin/jest.js --runInBand test/api-kinds.test.ts
```

`--runInBand` keeps the tests in one process, so the debugger sees them.

## UI against a backend

Run the Portal in [proxy mode](./local-run.md#ui-proxy-mode) against a local stack or a shared instance. Vite serves
source maps, so breakpoints work in the browser developer tools on the original `.ts` and `.tsx` files.

To debug from VS Code, start `pnpm dev:proxy` and add a browser launch configuration:

```json
{
  "name": "Portal (proxy mode)",
  "type": "chrome",
  "request": "launch",
  "url": "http://localhost:5173/login",
  "webRoot": "${workspaceFolder}/frontend/ui/packages/portal"
}
```

The browser talks only to Vite, so a failing request shows in the Network tab with the path the UI called. Vite
forwards it to `proxyServer`; look for the same request in the backend log. A 401 means you are not logged in on
that backend. Code in a workspace library runs from its `dist/`, so rebuild the library and restart Vite after a
change.

## Builder

The builder (`frontend/build-task-consumer`) is a NestJS service that runs `api-processor`. Build it once, so that
`api-processor` has its `dist/`, then start it with the Node.js inspector against a running backend:

```bash
pnpm exec nx build build-task-consumer
cd frontend/build-task-consumer
APIHUB_BACKEND_ADDRESS=localhost:8090 APIHUB_API_KEY=<access-token> pnpm start:debug
```

`start:debug` runs `nest start --debug --watch`, which opens the inspector on port 9229. Attach VS Code with an
**Attach to Node Process** configuration, or open `chrome://inspect`. Stop the builder of the Compose stack first,
or it takes the tasks. Publish a version in the Portal to give the builder a task.

## Java worker

`backend/java-task-consumer` has a debug harness: `DebugHarnessMain` (under `src/test`) runs the real poll loop
against an in-process queue and feeds it the four build types. It needs no backend and no container.

- In VS Code, open the folder `backend/java-task-consumer` itself and run **Debug JTC scenarios** from its
  `.vscode/launch.json`.
- In IntelliJ IDEA, run `com.netcracker.qubership.apihub.javataskconsumer.debug.DebugHarnessMain` with the working
  directory `backend/java-task-consumer`.

The harness looks for the Maven project from the working directory upward, so it fails when started from the
repository root. Set `GHCR_TOKEN` (a token with `read:packages`) for the scenario that pulls an image. The queue
listens on `127.0.0.1:18080`, the health endpoint on `http://127.0.0.1:13000/live`, and the reports land in
`java-task-consumer/target/jtc-debug/inbox/`. Details:
[`local-debug.md`](../../backend/java-task-consumer/docs/local-debug.md).

To debug the jar itself, start it with a debug agent and attach the IDE to port 5005:

```bash
java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005 \
  -jar backend/java-task-consumer/java-task-consumer/target/java-task-consumer-*.jar
```

## Storybook

Six components publish a Storybook. Build it once the way CI does; this also builds the workspace libraries it
imports:

```bash
pnpm exec nx run-many -t build:showcase -p <project>
```

Use `run-many` here: Nx can read `nx run <project>:build:showcase` as the target `build` with the configuration
`showcase`. Then start the Storybook in dev mode from its folder:

| Project | Folder | Command | Port |
|---|---|---|---|
| `api-doc-viewer` | `frontend/api-doc-viewer/packages/api-doc-viewer` | `pnpm development:storybook` | 9099 |
| `apispec-view` | `frontend/apispec-view/packages/elements` | `pnpm development:storybook` | 9099 |
| `class-view` | `frontend/class-view` | `pnpm development:local-server` | 6006 |
| `graphapi` | `frontend/graphapi` | `pnpm storybook` | 6006 |
| `rest-playground` | `frontend/rest-playground` | `pnpm storybook` | 9001 |
| `ui-shared` | `frontend/ui/packages/shared` | `pnpm storybook` | 6006 |

Debug a story in the browser developer tools. The Storybook of every branch that CI ran on is published on GitHub
Pages under `storybook/<component>/<branch>/`, so you can compare with `develop` without building it.

A failed screenshot test in CI uploads the diffs as `screenshot-diffs-<project>`; see [CI](./ci.md#read-a-red-run).
Running the screenshot tests locally needs a container engine for Chrome: Podman, Docker, or `wslc` on Windows; see
[Build and test](./build-and-test.md).

## Playwright UI mode

The Playwright suite lives in [`tests/ui-tests`](../../tests/ui-tests/README.md). Run it against the Compose stack:

1. Install the browser once: `pnpm exec playwright install chromium` in `tests/ui-tests`.
2. Create `tests/ui-tests/.env` (it is git-ignored):

   ```text
   BASE_URL=http://localhost:8081
   TEST_USER_PASSWORD=<APIHUB_ADMIN_PASSWORD of the stack>
   PLAYGROUND_BACKEND_HOST=http://host.docker.internal:8081
   ```

   Against the Portal in proxy mode, also set `DEV_PROXY_MODE=true`; the tests that cannot run there are skipped.
   See [`localhost-run.md`](../../tests/ui-tests/docs/localhost-run.md).

3. Open UI mode, which lists the tests, runs them one by one, and shows each step with the page:

   ```bash
   cd tests/ui-tests
   pnpm exec playwright test --project=Portal --ui
   ```

`--debug` opens the Playwright Inspector instead and stops before each action. A test that failed and was retried
in CI has a trace: download the `playwright-reports` artifact and open the report with
`pnpm exec playwright show-report <artifact>/playwright`. The report links the trace of each retried test.

## One Newman collection

The REST suite lives in [`tests/postman-collections`](../../tests/postman-collections/README.md). CI runs it with
Newman 6.2.3. To run one collection against the Compose stack, fill the environment file with the values that
`generate_env_and_up_compose.sh` printed and run the collection:

```bash
export APIHUB_ADMIN_EMAIL=<email> APIHUB_ADMIN_PASSWORD=<password> APIHUB_ACCESS_TOKEN=<token>
envsubst < tests/postman-collections/environment/local.postman_environment.json > ~/apihub.postman_environment.json
npm install -g newman@6.2.3
newman run tests/postman-collections/e2e/1_1_Smoke_Portal.postman_collection.json \
  -e ~/apihub.postman_environment.json
```

The environment points at `localhost:8081`. Add `--folder "<folder name>"` to run one folder of the collection, and
`--verbose` to print every request and response. To step through a request, import the collection and the
environment file into Postman. `1_2_Smoke_Agent` and `2_2_Negative_Agent` need the agent, which runs only on Kind.
