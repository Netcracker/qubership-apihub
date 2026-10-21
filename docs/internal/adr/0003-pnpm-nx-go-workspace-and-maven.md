# One build graph: pnpm, Nx, Go workspace, and Maven under Nx

## Status

Accepted

<!-- markdownlint-disable MD001 -->

#### Date

2026-10

#### Owner

@alagishev

#### Participants and approvers

APIHUB maintainers (@alagishev, @viacheslav-lunev, @karpov-aleksandr)

#### Related ADRs

[0001](./0001-one-repository-for-every-component.md), [0004](./0004-self-contained-ci-with-ci-ok.md)

<!-- markdownlint-enable MD001 -->

## Context

The repository holds TypeScript, Go, and Java code. Before the move, each repository had its own build tool and
lock file, and TypeScript modules depended on each other through published npm versions. In the monorepo a change to
a library must rebuild and retest its dependents, and developers need one way to build and test anything. An earlier
prototype of this monorepo already solved this with pnpm, Nx, and a Go workspace.

## Decision

We will use these tools, with the versions pinned in the repository:

- pnpm workspace (`pnpm-workspace.yaml`, one `pnpm-lock.yaml`) for TypeScript. Internal dependencies use
  `workspace:^`.
- Nx as the single task runner and dependency graph for every language: `pnpm exec nx run <project>:<target>`.
- A Go workspace (`go.work`, one `backend/.go-version`). Nx tags Go modules `lang:go` (`tools/nx/go-lang-tag.js`) and
  runs them through `nx-go`. Images build each module with `GOWORK=off`, so every `go.mod` must match the workspace.
  `go work sync` and `tools/ci/go-work-sync-check.sh` keep them aligned.
- Maven for Java, driven by the `@nx/maven` plugin, which reads the POMs.

### Justification

- Nx builds libraries before their dependents (`^build`) and supports `affected` runs, which keeps CI proportional to
  the change.
- A Go workspace lets services use `commons-go` from the tree without publishing it.
- Rejected: per-language tools without a shared graph. CI would need hand-written knowledge of which modules affect
  which images.
- Rejected: Maven or Gradle as the root. Most of the code is TypeScript.

## Consequences

- Every Nx command loads `@nx/maven`, which runs Maven. Frontend developers need Java 21 and Maven 3.9 or newer too.
- On Windows, inferred Maven targets need `MAVEN_HOME`.
- A Go module that is out of sync with `go.work` passes locally and fails in the image build, so CI checks it.
- `nx-go` has no release support, which shapes the release flow
  ([0005](./0005-release-flow-with-per-component-bumps.md)).
