---
name: apihub-add-go-service
description: "Adds a Go backend service to the qubership-apihub monorepo and wires it into every place that lists services: go.work, Go version, Dockerfile, config template, Nx inference and the lang:go tag, CI image matrix, release registration, CODEOWNERS and Dependabot, Helm chart and values, Docker Compose, and docs/configuration-reference.md. Use when creating a module under backend/ (for example libraries-backend), or when checking that an existing one is fully wired."
---

# Add a Go backend service

Follow `AGENTS.md`. This skill is the checklist of every file that names a Go service. The references are
`backend/api-linter-service` (service with config file and extension role) and `backend/agents-backend`
(same shape). `backend/commons-go` is the shared library; `backend/agent` and `backend/test-service` build
from their own directory because they do not use it.

## Before you start

Ask for what you cannot derive; do not guess:

- Directory name `<name>` (it becomes the Nx project name, the release tag prefix `<name>/`, and the module
  directory). Image name (existing images keep their legacy names, for example `qubership-api-linter-service`).
- Does it use `backend/commons-go`? That decides the Docker build context (see step 4).
- Is it part of the product Helm chart and Compose stacks, or an internal tool? That decides steps 9 and 10.
- Which config file or environment variables it reads, and its HTTP port.

## Steps

Work top to bottom. Each step lists the files and how to check it.

### 1. Module and workspace

- Create `backend/<name>/go.mod` with
  `module github.com/Netcracker/qubership-apihub/backend/<name>` and `go` equal to the content of
  `backend/.go-version`. There is one Go version for the whole workspace; no per-module `.go-version`.
- With commons-go, require `github.com/Netcracker/qubership-apihub/backend/commons-go v0.0.1` and add
  `replace github.com/Netcracker/qubership-apihub/backend/commons-go => ../commons-go`.
- Add `./backend/<name>` to the `use (...)` block of the root `go.work`, in alphabetical order.
- Run `go work sync` from the root and commit the `go.mod`, `go.sum`, and `go.work.sum` changes. Images build
  each module with `GOWORK=off`, so every `go.mod` must hold the versions the workspace resolves.
- Check: `bash tools/ci/go-version-check.sh` and `bash tools/ci/go-work-sync-check.sh` (Git Bash on Windows).

### 2. Module files

Copy the shape of `backend/api-linter-service`: `main.go`, `README.md`, `LICENSE`, `.gitignore`,
`.dockerignore` (only for a module that builds from its own directory), `wwhrd.yml`, `third-party-tools.env` if
it downloads tools, `docs/api/` for the OpenAPI file. Keep the Apache 2.0 header on every Go file.

Do not add `AGENTS.md`, `CLAUDE.md`, `apm.yml`, or compiled `.cursor/` or `.claude/` trees to the module: the
root `apm compile` covers it (see step 11).

### 3. Config template

If the service reads a config file, put `config.template.yaml` at the module root. The backend, the linter,
and agents-backend load `config.yaml` from a folder named by an environment variable
(`LINTER_CONFIG_FOLDER`). Use `<NAME>_CONFIG_FOLDER` the same way, and give every key a default that the
code applies when the key is absent. Environment-only services skip this step.

### 4. Dockerfile

- With commons-go: the build context is `backend/`, the Dockerfile is `backend/<name>/Dockerfile`, and the builder
  stage runs `COPY commons-go ./commons-go` and `COPY <name> ./<name>` so that `replace ../commons-go` resolves.
  The shared `backend/.dockerignore` applies; add host-only artifacts of the new module to it.
- Without commons-go: the context is `backend/<name>`, with the module's own `.dockerignore`.
- Builder: `docker.io/golang:<go-version>-alpine3.23`; keep the version equal to `backend/.go-version`
  (Dependabot's docker ecosystem bumps it, and `go-version-check.sh` guards the module side).
- Run every Go command with `GOWORK=off`, `CGO_ENABLED=0`, `GOFLAGS=-mod=readonly`.
- Runtime: the pinned `ghcr.io/netcracker/qubership-core-base` image, `USER 10001:10001`, files copied with
  `--chown=10001:0 --chmod=555`.
- Check: `podman build -f backend/<name>/Dockerfile backend` (or the module directory as the context).

### 5. Nx project and the `lang:go` tag

Nothing to write. `@nx-go/nx-go` infers the project from `go.mod`, and `tools/nx/go-lang-tag.js` tags every
`**/go.mod` project `lang:go`. Do not add a `project.json` for the tag.

Check: `pnpm exec nx show project <name>` lists the `build` and `test` targets and the `lang:go` tag, and
`pnpm exec nx run <name>:build` and `pnpm exec nx run <name>:test` pass. If the module imports commons-go, Nx
infers the dependency from `go.work`; confirm with `pnpm exec nx graph --file=graph.json` when in doubt.

### 6. Release registration

- `nx.json`: add a release group under `release.groups`, copied from `agents-backend`
  (`projects: ["<name>"]`, `projectsRelationship: "fixed"`, `versionActions` pointing at
  `tools/release/version-actions/tag-only.js`). The tag becomes `<name>/X.Y.Z`; a component without a tag starts
  from `0.0.0`.
- `tools/release/artifacts.js`: add `'<name>': '<image name>'` to `IMAGES`.
- `tools/release/product-version.js`: add `'<name>'` to `PRODUCT_COMPONENTS` only if the service ships in the
  product Helm chart; internal tools do not move the product version.
- `docs/development/release-process.md`: add the component to the lists of tagged components.
- Check: `node --test tools/release` and a dry run of `node tools/release/version-plan.js` if the plan script is
  runnable on your branch.

### 7. CI

- `.github/workflows/ci.yml`: add the name to the `images='[...]'` list of the `plan` job, and an entry to the
  `images:` array of the `go-images` job: `project`, `image`, `dockerfile`, `build_projects`
  (`<name>,commons-go` with commons-go), `context`, `dockerignore`, `workspace_build: "false"`.
- `.github/workflows/security-scan-apihub.yml`: add the image name to the scan list.
- E2E workflows (`e2e-tests-compose.yml`, `e2e-tests-kind.yml`) only when the service is a runtime part of the
  stack: add it to the image repoint step and to the container list.
- The `go` job selects projects by the `lang:go` tag, and `go-check-license.yaml` finds every
  `backend/*/go.mod`; neither needs an edit. A module without its own `wwhrd.yml` uses the one of
  `backend/portal-backend`.

### 8. CODEOWNERS and Dependabot

- `.github/CODEOWNERS`: `/backend/` already owns the new directory. Add a line only for different owners, and
  keep the order general to specific.
- `.github/dependabot.yml`: add `/backend/<name>` to the `gomod` directories and to the `docker` directories.
  Both lists are explicit because Dependabot does not expand them.

### 9. Helm chart

Skip for services outside the product chart. Otherwise follow the `apihub-deployment-authoring` skill and copy the
linter's files in `deploy/helm-templates/qubership-apihub/templates/`: `*-deployment.yaml`, `*-service.yaml`,
`*-serviceaccount.yaml`, `*-rolebinding.yaml`, `*-secret.yaml`, and `*-config-secret.yaml` for a config file.
Add a values section (`qubership<Name>` with `image`, `resource`, `env`, `customCa`, `goMemLimit`) to
`values.yaml`. If the backend calls the service, add it to the backend `extensions` list and give the UI its
address. A service the browser reaches through the portal also needs a `location` block in
`frontend/ui/nginx/nginx.conf.template` and an `*_ADDRESS` variable (see `API_LINTER_SERVICE_ADDRESS`).
Mirror the values in `deploy/helm-templates/local-k8s-quickstart/`.

Check: `helm lint deploy/helm-templates/qubership-apihub` and `helm template` with the new section enabled.

### 10. Docker Compose

Add the service to `deploy/docker-compose/apihub-generic/docker-compose.yml` and
`deploy/docker-compose/with-keycloak/docker-compose.yml`, with its mounted config file next to them, a database
entry in `scripts/init-db/init.sql` when it has one, and `host.docker.internal` URLs where the backend reaches it.
Keep `GOMEMLIMIT` below the container memory limit (about 80%).

Check: `docker compose -f <file> config`.

### 11. Documentation and APM

- `docs/configuration-reference.md`: add rows for the config file, env vars, Helm values, and the token or URL
  consistency list. It must stay in sync with `values.yaml` and the Compose files.
- `docs/installation-guide.md` and `docs/admin-guide.md` when the install steps or operations change.
- If the module needs its own agent rules, add a package `backend/<name>/agent-packages/<pkg>/` with every
  instruction `applyTo` prefixed `backend/<name>/`, list it as `./backend/<name>/agent-packages/<pkg>` in the
  root `apm.yml`, and run `apm install --target cursor,claude --legacy-skill-paths` and
  `apm compile --target cursor,claude --legacy-skill-paths` at the root.

## Final check

1. `bash tools/ci/go-version-check.sh && bash tools/ci/go-work-sync-check.sh`
2. `pnpm exec nx run-many -t build,test -p <name>`
3. A container build of the Dockerfile.
4. `rg "<neighbour service name>" -l --glob '!backend/**'` lists every file that names a comparable service;
   each hit is either updated for `<name>` or deliberately skipped. Report the skipped ones.
