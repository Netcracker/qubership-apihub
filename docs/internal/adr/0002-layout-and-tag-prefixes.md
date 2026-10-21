# Repository layout and tag prefixes

## Status

Accepted

<!-- markdownlint-disable MD001 -->

#### Date

2026-10-18

#### Owner

@alagishev

#### Participants and approvers

APIHUB maintainers (@alagishev, @viacheslav-lunev, @karpov-aleksandr)

#### Related ADRs

[0001](./0001-one-repository-for-every-component.md), [0005](./0005-release-flow-with-per-component-bumps.md)

<!-- markdownlint-enable MD001 -->

## Context

After [0001](./0001-one-repository-for-every-component.md), every former repository needed a folder, a release tag
scheme, and a Go module path. Existing images (`ghcr.io/netcracker/qubership-apihub-*`) and npm packages
(`@netcracker/qubership-apihub-*`) have consumers that must not notice the move. The product itself has bare semantic
version tags (`2.15.0`), and each module had its own tag history.

## Decision

We will lay out the repository by kind of component:

| Folder | Holds |
|---|---|
| `backend/` | Go services and `commons-go`, `java-task-consumer`, `libraries-backend` |
| `frontend/` | `ui`, `build-task-consumer`, and the TypeScript libraries |
| `tests/` | `postman-collections`, `ui-tests` |
| `deploy/` | `helm-templates`, `docker-compose` |
| `docs/`, `sites/`, `tools/` | documentation, Pages sites, CI and release tooling |

Each module folder uses the short name of the component (`backend/portal-backend`, `frontend/ui`). A module's tags are
`<folder name>/<version>`, for example `portal-backend/1.21.0` and `api-diff/4.0.0`. Product tags stay bare semantic
versions and continue from `2.15.0`. Imported tags got the prefix of their module (`commons-go` lost its leading `v`).

Go module paths are `github.com/Netcracker/qubership-apihub/backend/<name>`, and services use
`replace ... => ../commons-go`. Image names, npm package names, and the Helm chart name do not change.

### Justification

- Folder names double as tag prefixes, so a tag tells you the folder and the release tooling needs no mapping table.
- Keeping artifact names means no consumer changes anything on upgrade.
- Rejected: version tags without prefixes. Thirty modules share one tag namespace and collide.
- Rejected: Go module tags. `commons-go` has no consumers outside the repository, so `replace` is enough.

## Consequences

- A new component needs a folder, a tag prefix, and an entry in the places that list components. The
  `apihub-add-go-service` agent skill lists them for Go services.
- Folder renames now also rename tag prefixes for future tags, so a rename needs its own decision.
- Product release tooling must tell product tags (bare) from module tags (prefixed).
