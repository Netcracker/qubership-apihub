# Getting started

Set up a workstation for the APIHUB monorepo, clone it, install the dependencies, and build and test a first module of
each language. Everything here runs on Linux, macOS, and Windows; the [Windows notes](#windows-notes) list what
differs there.

## Tools

Install every tool in the first table, whatever part of the product you work on. Nx runs all builds and tests, and
every Nx command loads the Maven plugin, which runs Maven to read the `pom.xml` files. A frontend developer needs Java
and Maven too: on a fresh clone, Nx cannot build its project graph without them.

| Tool | Version | Needed for | Check |
|---|---|---|---|
| Git | any recent 2.x | the clone | `git --version` |
| Node.js | 24 | every Nx command, all TypeScript modules | `node --version` |
| pnpm | 12.4.2, the `packageManager` field of the root [`package.json`](../../package.json) | the install, every script | `pnpm --version` |
| Go | 1.27.2, from [`backend/.go-version`](../../backend/.go-version) | the Go services and the Nx graph | `go version` |
| Java (JDK) | 21 | the Java worker and the Nx graph | `java -version` |
| Maven | 3.9 or newer | the Java worker and the Nx graph | `mvn --version` |

Install pnpm with `npm install -g pnpm@12.4.2`, or with `corepack enable pnpm`, which reads the version from
`packageManager`. Any JDK 21 distribution works; CI uses Eclipse Temurin.

Go 1.21 and newer can download the right toolchain: with the default `GOTOOLCHAIN=auto`, an older local Go switches to
the version that `go.work` names. Installing 1.27.2 directly avoids the download on the first build.

These tools are needed only for some tasks:

| Tool | Needed for | Check |
|---|---|---|
| Podman 5 (or Docker) with Compose | screenshot tests, building images, running the product in Compose | `podman --version` |
| kind, kubectl, Helm 3 | running the product in a local Kubernetes cluster | `kind version` |
| Newman | running Postman collections from the command line | `newman --version` |
| GitHub CLI | issues, pull requests, workflow runs from the terminal | `gh --version` |

[Local run](./local-run.md) and [Build and test](./build-and-test.md) say when each one is needed.

`pnpm install` needs no GitHub Packages token. All `@netcracker` packages that the workspace uses are workspace
projects, and the lockfile resolves nothing from `npm.pkg.github.com`. Older guides asked for a personal access token
with `read:packages`; you can skip that step.

## Git settings

Set these once, before the clone:

```bash
git config --global core.autocrlf false
git config --global core.longpaths true
```

- `core.autocrlf false` keeps files as they are in the repository. [`.gitattributes`](../../.gitattributes) forces LF
  for `*.sh`, `*.yml`, `*.yaml`, and `patches/*.patch` in any case: pnpm cannot apply a patch with CRLF line endings,
  and a shell script with CRLF fails in Linux containers.
- `core.longpaths true` lets Git on Windows check out paths longer than 260 characters. Some `node_modules` paths are
  that long. It changes nothing on Linux and macOS.

To leave your global settings alone, set them for the clone only:
`git clone -c core.autocrlf=false -c core.longpaths=true <url>`. The clone stores them in its own config before the
checkout.

## Clone

```bash
git clone https://github.com/Netcracker/qubership-apihub.git
cd qubership-apihub
```

The default branch is `develop`.

## Install

From the repository root:

```bash
pnpm install
```

This installs the dependencies of all 35 workspace projects into one `node_modules` tree and applies the patch in
[`patches/`](../../patches/). Never run `npm install` inside a module: there is one lockfile, `pnpm-lock.yaml` at the
root, and pnpm always installs the whole workspace.

The install takes minutes, not seconds, on a cold clone. If the pnpm store already holds the packages, nothing
comes from the network.

`pnpm install` does not run dependency build scripts. Each one is listed and denied under `allowBuilds` in
[`pnpm-workspace.yaml`](../../pnpm-workspace.yaml), so Puppeteer downloads no Chrome and husky installs no Git hooks.
A dependency update that brings a new build script fails the install with `ERR_PNPM_IGNORED_BUILDS` until it is added
there.

## First build and test

Nx runs every build and test, whatever the language. Before it runs anything, Nx builds the project graph, and the
Maven plugin analyzes the `pom.xml` files for it. On a cold clone the first command takes minutes before it prints
anything. The Nx daemon keeps the graph between commands, so later ones start faster.

List the projects:

```bash
pnpm exec nx show projects
```

Build and test one module of each language:

```bash
# TypeScript: two libraries and the libraries they depend on
pnpm exec nx run-many -t build test -p json-crawl,api-unifier

# Go: the shared library and the agent
pnpm exec nx run-many -t build test -p commons-go,agent

# Java: the whole Maven reactor (mvn verify)
pnpm exec nx run java-task-consumer:build
```

A green run ends with `Successfully ran targets build, test for 2 projects` and a summary of the run. The TypeScript
line also builds `ddlapi` and `graphapi`, which `api-unifier` depends on; its tests take the longest. TypeScript
output lands in each project's `dist/`, Go binaries in `dist/backend/<name>`.
[Build and test](./build-and-test.md) covers the other targets.

If the first command fails with a Maven analysis timeout, set `NX_MAVEN_ANALYSIS_TIMEOUT=400` (seconds) and run it
again; CI sets the same value because the default of 120 seconds is too short for a cold Maven cache.

## The Nx cache

Nx caches the result of every cacheable target. A second run of the same command with the same inputs prints
`[existing outputs match the cache, left as is]` for each task and finishes in seconds.

- The cache lives in `~/.nx/<id>/`, where `<id>` comes from the Git repository, so all worktrees of the
  repository share it.
- `pnpm exec nx reset` clears the cache and stops the daemon. Use it when the graph looks stale, for example after a
  `pom.xml` or `go.work` change that Nx did not notice.
- `--skip-nx-cache` runs one command without reading the cache.

## Windows notes

- **Maven home.** Inferred Maven targets, such as `com.netcracker.qubership.apihub:jdiff-engine:test`, need the
  `MAVEN_HOME` environment variable set to the Maven installation directory, for example
  `C:\Tools\maven\apache-maven-3.9.9`. `java-task-consumer:build` runs `mvn` from `PATH` and works without it.
- **The `@nx/maven` patch.** The Maven plugin reports Windows paths with backslashes, and without a fix every Nx command
  fails with `Source file backend\java-task-consumer\jdiff-engine\pom.xml does not exist in the workspace`.
  [`patches/@nx__maven@23.2.0.patch`](../../patches/@nx__maven@23.2.0.patch) converts the paths, and `pnpm install`
  applies it. If you see that error, run `pnpm install` again from the root.
- **Line endings.** Use `core.autocrlf false`. With `true`, the patch in `patches/` and the shell scripts still check
  out with LF because of `.gitattributes`, but other files differ from what CI sees.
- **Long paths.** Clone to a short path, such as `C:\src\apihub`, and set `core.longpaths true`. Deleting a
  `node_modules` tree with `rmdir /s` can fail on long paths; `rm -rf` from Git Bash works.
- **Shell.** The `pnpm`, `nx`, `git`, and `go` commands in these guides work the same in Git Bash and PowerShell. Lines
  that set a variable (`export NAME=value`) are Git Bash; in PowerShell write `$env:NAME = 'value'`.
- **Containers.** The screenshot tests start Chrome in a container through the `podman` command. Install Podman
  Desktop with its WSL machine; set `DOCKER_BINARY=docker` to use Docker instead. [Build and test](./build-and-test.md)
  has the details.

## Nx hangs or times out

Symptoms: a command prints nothing for many minutes, or fails with a timeout from the daemon or from a plugin worker.
It happens when many Nx processes run at once, for example several worktrees or agents, and on Windows under load.

1. Run `pnpm exec nx reset` to stop the daemon and clear its state.
2. Run the command again with the daemon off: `NX_DAEMON=false pnpm exec nx show projects`.
3. If a plugin worker still times out, also turn off plugin isolation:
   `NX_DAEMON=false NX_ISOLATE_PLUGINS=false pnpm exec nx show projects`.

In PowerShell, set the variables with `$env:NX_DAEMON = 'false'` and `$env:NX_ISOLATE_PLUGINS = 'false'`. Both
settings trade speed for stability: without the daemon, every command rebuilds the project graph.

## IDE hints

- **Go.** Open the repository root: [`go.work`](../../go.work) makes the six Go modules one workspace, so navigation
  works across `commons-go` and the services. GoLand and VS Code with the Go extension both read it.
- **Java.** Open [`pom.xml`](../../pom.xml) at the root as a Maven project in IntelliJ IDEA; it aggregates the Java
  modules. Set the project JDK to 21.
- **TypeScript.** Open the repository root. Each project has its own `tsconfig.json`; the editor uses the TypeScript
  version from `node_modules`.
- **Nx.** The Nx Console extension for VS Code and IntelliJ lists the projects and runs their targets.
- **Line length and style.** The modules carry their own `.editorconfig` and ESLint settings; let the editor apply them.

## What to read next

- [Development workflow](./workflow.md): from an issue to a merged pull request.
- [Build and test](./build-and-test.md): all targets of all languages, images, and the E2E suites.
- [Local run](./local-run.md): the whole product on your machine.
