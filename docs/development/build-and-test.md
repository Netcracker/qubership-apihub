# Build and test

Every module of the repository, whatever its language, is an Nx project. You build and test each one with the same
commands from the repository root. This page covers Nx itself, then what is specific to TypeScript, Go, and Java, the
container images, the Storybooks and screenshot tests, and the E2E suites. Set up the tools first:
[Getting started](./getting-started.md).

## Nx basics

Run everything from the repository root with `pnpm exec nx`:

```bash
# one target of one project
pnpm exec nx run api-diff:build

# several targets of several projects, in dependency order
pnpm exec nx run-many -t build test -p api-diff,api-processor

# what your branch changed, compared with develop
pnpm exec nx affected -t build test
```

- **Projects.** `pnpm exec nx show projects` lists them; `pnpm exec nx show project <name>` prints the targets of one,
  and `--web` opens it in the browser. `pnpm exec nx graph` shows the dependency graph.
- **Project names.** TypeScript projects are named in the `nx.name` field of their `package.json`, for example
  `ui-portal` for `frontend/ui/packages/portal`. Go projects take the module directory name (`portal-backend`). The
  Maven plugin names Java projects `<groupId>:<artifactId>`; the parent project is renamed `java-task-consumer`.
- **Targets.** A TypeScript project's targets are the scripts of its `package.json`. Go targets come from the
  `@nx-go/nx-go` plugin, Java targets from `@nx/maven`.
- **Dependencies.** `build` and `test` build the in-repo dependencies first (`dependsOn: ["^build"]` in
  [`nx.json`](../../nx.json)), so `nx run api-processor:test` builds `api-unifier`, `api-diff`, and the rest before it
  runs the tests.
- **Cache.** `build`, `test`, `lint:check`, `type-check`, and `screenshot-test` are cached. A repeated run with the
  same inputs restores the output and the log instead of running again. `--skip-nx-cache` forces a run;
  `pnpm exec nx reset` clears the cache and stops the daemon.
- **Affected.** `nx affected` compares with `develop` (`defaultBase` in `nx.json`). CI runs the same command against
  the merge base of the pull request. Use `--base=<ref>` to compare with something else.
- **Tags.** Every Go module has the tag `lang:go`, and the Java projects `lang:java` or `maven:<groupId>`. Select by tag
  with `-p tag:lang:go` or exclude with `--exclude=tag:lang:go`.

The root `package.json` scripts `pnpm build` and `pnpm test` run `pnpm -r build` and `pnpm -r test` over the
workspace without Nx: no dependency order, no cache. Prefer the Nx commands.

## TypeScript

The pnpm workspace in [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) holds the frontend libraries, the UI, the
builder (`build-task-consumer`), the Playwright tests, the screenshot test environment, and the sites. One
`pnpm install` at the root installs all of them.

| Target | What it does | Examples |
|---|---|---|
| `build` | compiles to the project's `dist/` | `nx run api-processor:build`, `nx run-many -t build -p ui-portal,ui-agents` |
| `test` | runs the unit tests (Jest) | `nx run api-diff:test`, `nx run ui-shared:test` |
| `lint:check` | runs ESLint without fixing | `nx run ui-portal:lint:check` |
| `lint:fix` | runs ESLint and fixes what it can | `nx run api-unifier:lint:fix` |
| `type-check` | runs `tsc` without output, where the project has it | `nx run apispec-view:type-check` |

- Dependencies between workspace projects use `workspace:` ranges. A change in `api-unifier` reaches `api-processor`
  on the next build, without publishing anything.
- The workspace uses `nodeLinker: isolated`: each project sees only the dependencies it declares. An import of an
  undeclared package fails to resolve even when another project has it. Add the dependency to the project's
  `package.json` and run `pnpm install` at the root.
- Run a script of one project without Nx with `pnpm --filter <package name> run <script>`, for example
  `pnpm --filter @netcracker/qubership-apihub-api-diff run test:compatibility-suites`. Nx does not cache it.

## Go

The six Go modules under `backend/` form one workspace in [`go.work`](../../go.work): `portal-backend`,
`api-linter-service`, `agents-backend`, `agent`, `test-service`, and the shared library `commons-go`. All of them use
the Go version in [`backend/.go-version`](../../backend/.go-version).

```bash
pnpm exec nx run portal-backend:build
pnpm exec nx run-many -t build test -p tag:lang:go
```

- `build` writes the binary to `dist/backend/<module>` (`.exe` on Windows); `test` runs `go test ./...` in the module.
- `go` commands work too from a module directory, for example `go test ./service/...` in `backend/portal-backend`. They
  use the workspace, so a change in `commons-go` is visible at once.
- **Keep `go.mod` files in sync with the workspace.** The images build each module alone with `GOWORK=off`, so every
  `go.mod` must already require the versions the workspace resolves. After adding or upgrading a dependency, run
  `go work sync` at the root and commit the changed `go.mod` and `go.sum` files.
  [`tools/ci/go-work-sync-check.sh`](../../tools/ci/go-work-sync-check.sh) is the check CI runs; run it locally in Git
  Bash to see the same result.
- **Change the Go version in one place.** Edit `backend/.go-version`, the `go` line of `go.work` and of every `go.mod`,
  and the `golang` base image of the Dockerfiles. [`tools/ci/go-version-check.sh`](../../tools/ci/go-version-check.sh)
  fails CI when they disagree.

## Java

`backend/java-task-consumer` is a Maven reactor with two modules, `jdiff-engine` and `java-task-consumer`. The root
[`pom.xml`](../../pom.xml) aggregates it, so `@nx/maven` sees it.

```bash
# the whole reactor: mvn --batch-mode verify, with all tests
pnpm exec nx run java-task-consumer:build

# one Maven module through the inferred targets
pnpm exec nx run com.netcracker.qubership.apihub:jdiff-engine:test
```

- `java-task-consumer:build` is the target CI runs. It writes the shaded jar to
  `backend/java-task-consumer/java-task-consumer/target/`.
- Plain Maven works too: `mvn verify` in `backend/java-task-consumer`.
- The Pact test rewrites the tracked file `backend/java-task-consumer/pacts/java-task-consumer-libraries-backend.json`
  on every run, with new timestamps only. Restore it with
  `git checkout -- backend/java-task-consumer/pacts` unless you changed the contract.
- **Windows:** the inferred Maven targets need `MAVEN_HOME` set to the Maven installation directory. Without it they
  fail at once with `had no output from Maven`. `java-task-consumer:build` calls `mvn` from `PATH` and does not need
  it.

## Images

CI builds and publishes the images; you build one locally only to run it in Compose or kind (see
[Local run](./local-run.md)). The commands below match what [`images.yml`](../../.github/workflows/images.yml) does.
They use `podman`; `docker` takes the same arguments.

| Image | Build first | Image build (from the repository root) |
|---|---|---|
| `qubership-apihub-backend` | nothing | `podman build -f backend/portal-backend/Dockerfile backend` |
| `qubership-api-linter-service` | nothing | `podman build -f backend/api-linter-service/Dockerfile backend` |
| `qubership-apihub-agents-backend` | nothing | `podman build -f backend/agents-backend/Dockerfile backend` |
| `qubership-apihub-agent` | nothing | `podman build -f backend/agent/Dockerfile backend` |
| `qubership-apihub-test-service` | nothing | `podman build -f backend/test-service/Dockerfile backend` |
| `qubership-apihub-ui` | `pnpm exec nx run-many -t build -p ui-portal,ui-agents` | `podman build -f frontend/ui/Dockerfile .` |
| `qubership-apihub-build-task-consumer` | `pnpm exec nx run build-task-consumer:build`, then `pnpm deploy --filter=./frontend/build-task-consumer --prod .deploy/build-task-consumer` | `podman build -f frontend/build-task-consumer/Dockerfile .` |
| `qubership-apihub-java-task-consumer` | `pnpm exec nx run java-task-consumer:build` | `podman build backend/java-task-consumer` |

Add `-t <name>:<tag>` to name the image, for example `-t ghcr.io/netcracker/qubership-apihub-backend:local`.

- The Go images compile inside the image with `GOWORK=off`. The service images use `backend` as the build context
  because they copy `commons-go` next to the service.
- The UI and builder images copy what the workspace build wrote on the host, so build first. `pnpm deploy` writes a
  production `node_modules` for the builder into `.deploy/`, which Git ignores.

## Storybooks

Six components have a Storybook, which CI publishes to GitHub Pages. Start one locally with its dev server:

| Component | Dev server | Static build (`build:showcase`) |
|---|---|---|
| `api-doc-viewer` | `pnpm exec nx run api-doc-viewer:development:storybook` | `frontend/api-doc-viewer/dist-showcase` |
| `apispec-view` | `pnpm exec nx run apispec-view:development:storybook` | `frontend/apispec-view/dist-showcase` |
| `class-view` | `pnpm --filter @netcracker/qubership-apihub-class-view run development:local-server` | `frontend/class-view/dist-showcase` |
| `graphapi` | `pnpm exec nx run graphapi:storybook` | `frontend/graphapi/dist-showcase` |
| `rest-playground` | `pnpm exec nx run rest-playground:storybook` | `frontend/rest-playground/dist-showcase` |
| `ui` | `pnpm exec nx run ui-shared:storybook` | `frontend/ui/dist-showcase` |

`pnpm exec nx run-many -t build:showcase -p <project>` builds the static Storybook into the folder in the last column.
Use `run-many`: CI does the same, because Nx can read `nx run <project>:build:showcase` as the target `build` with the
configuration `showcase`. The list of published Storybooks is
[`tools/ci/storybooks.json`](../../tools/ci/storybooks.json).

## Screenshot tests

`api-doc-viewer`, `apispec-view`, and `class-view` have screenshot tests. Each run builds the Storybook, serves it,
opens every story in Chrome, and compares the result with the reference images committed next to the tests. Chrome
runs in a container, so the pixels match CI on any operating system.

```bash
pnpm exec nx run class-view:screenshot-test
```

- **A container engine is required.** The test environment
  ([`tools/jest-chrome-in-docker-environment`](../../tools/jest-chrome-in-docker-environment/)) starts Chrome with the
  `podman` command. Set `DOCKER_BINARY=docker` to use Docker instead. On Windows, run Podman Desktop with its WSL
  machine.
- **WSL containers work on Windows too.** Set `DOCKER_BINARY=wslc` to start Chrome with `wslc.exe`, which WSL 3.0
  and later include. Run the tests from PowerShell or Git Bash: `wslc` cannot be called from inside a WSL
  distribution. `wslc` keeps its own images, so the first run pulls the test image again. Headful runs need host
  networking, which `wslc` does not support, so keep `headless: true` in the Puppeteer config.
- **Chrome in the container must reach the host.** The environment looks up the host address from inside the
  container (`host.docker.internal`, the container gateway, then `host.wslc.internal`) and checks it on the Storybook
  port. When none answers, the run stops in `globalSetup` with `Could not resolve IP address of host machine`.
- **Update the reference images** after an intended visual change with the `regenerate-screenshots` script, for
  example `pnpm --filter @netcracker/qubership-apihub-class-view run regenerate-screenshots`. Commit the new images
  with the change and look at each one before you do.
- When a screenshot test fails in CI, the run uploads the diff images as the `screenshot-diffs-<project>` artifact.

## E2E tests

The E2E suites run against a running product: CI stands it up on kind for every pull request (see [CI](./ci.md)).
To run them locally, start the product first, as described in [Local run](./local-run.md). The default local
address is `http://localhost:8081`.

### Newman (Postman collections)

The collections are in [`tests/postman-collections/e2e/`](../../tests/postman-collections/e2e/). The environment
[`local.postman_environment.json`](../../tests/postman-collections/environment/local.postman_environment.json) points
at `localhost:8081` and reads the administrator credentials from placeholders. Pass the real values with `--env-var`:

```bash
npm install -g newman@6.2.3
newman run tests/postman-collections/e2e/1_1_Smoke_Portal.postman_collection.json \
  -e tests/postman-collections/environment/local.postman_environment.json \
  --env-var "Username=<admin email>" --env-var "User_email=<admin email>" \
  --env-var "Password=<admin password>" --env-var "at-api-key=<access token>"
```

The administrator and the access token are the `APIHUB_ADMIN_EMAIL`, `APIHUB_ADMIN_PASSWORD`, and
`APIHUB_ACCESS_TOKEN` values of your deployment. CI runs the collections in the order `1_1`, `1_2` (with the agent
only), `1_3`, `2_1`, `3_1`, `3_2`, `4`.

### Playwright

The Playwright project is `tests/ui-tests`, part of the pnpm workspace; `pnpm install` at the root installed it.

```bash
cd tests/ui-tests
pnpm exec playwright install chromium
BASE_URL=http://localhost:8081 TEST_USER_PASSWORD=<password> pnpm exec playwright test --project=Portal
```

- CI on Kind runs `--project=Portal --project=Agent --workers=8 --grep-invert=@flaky|@specific`. Compose runs
  `--project=Portal --workers=8 --grep-invert=@flaky|@specific`: that stack has no agent.
- A `.env` file in `tests/ui-tests` can hold `BASE_URL`, `TEST_USER_PASSWORD`, and the other variables. The
  [`tests/ui-tests` README](../../tests/ui-tests/README.md) lists them, with the extra settings for a local or Compose
  stack.
- `pnpm exec playwright test --ui` opens the interactive runner; `pnpm exec playwright show-report` opens the last
  report. [Debugging](./debugging.md) has more.

## Linting outside Nx

Two linters run in CI on every pull request but not through Nx:

- super-linter over the changed files, with the configurations in [`.github/linters/`](../../.github/linters/);
- the link checker (lychee) over the Markdown files.

For Markdown, `npx markdownlint-cli --config .github/linters/.markdownlint.json <files>` gives the same result locally.
