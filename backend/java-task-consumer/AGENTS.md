# java-task-consumer — Agent Instructions

Stateless Java worker that polls `libraries-backend` for Java API build tasks (API inventory, jar-to-jar API diff,
upgrade impact) and reports the results. It is a Maven reactor with two modules. Plain Java, no application
framework; japicmp and jdeps do the analysis. Follow the root [`AGENTS.md`](../../AGENTS.md) and
[`backend/AGENTS.md`](../AGENTS.md).

## Where the code is

| Area | Location |
|------|----------|
| Reactor parent | `pom.xml`, `project.json` (Nx project `java-task-consumer`) |
| Analysis engine | `jdiff-engine/` |
| Poll loop, backend HTTP client, `/live` | `java-task-consumer/` |
| Design, HTTP contract, Pact handoff, local debug | `docs/` (`DESIGN.md`, `backend-api.md`, `pact-libraries-backend.md`, `local-debug.md`) |
| Pact files | `pacts/` |
| Image and chart | `Dockerfile`, `helm/java-task-consumer/` |

## Build and test

Nx projects: `java-task-consumer` (whole reactor, runs `mvn --batch-mode verify`),
`com.netcracker.qubership.apihub:java-task-consumer`, and `com.netcracker.qubership.apihub:jdiff-engine`
(inferred by `@nx/maven`):

```bash
pnpm exec nx run java-task-consumer:build
```

Or `mvn --batch-mode verify` from this directory. Java 21 and Maven 3.9 are required.

## Traps

- On Windows, inferred Maven targets need `MAVEN_HOME` set. `patches/@nx__maven@23.2.0.patch` fixes backslash
  paths in `@nx/maven`.
- `libraries-backend` (the HTTP counterpart) is not in the tree yet. The contract is `docs/backend-api.md`; keep
  `pacts/` in step with it.
- All three Maven projects are one release group (`java-task-consumer`, tag-only versions).
- `helm/java-task-consumer/` is the module's own chart; the product chart is in `deploy/helm-templates/`.

## Agent packages

Local package: none. These packages reach this path:

- `apihub-add-go-service` (skill, root package): the checklist to follow when `libraries-backend` is added; it
  names this module as a neighbor.
- `apihub-deployment-authoring` (skill, root package): use when a change touches Helm, Compose, or docs.
- `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
  `markdown-line-length-120`: always-on conventions and planning from a ticket.

The store Go rules do not apply (no `*.go` files here).
