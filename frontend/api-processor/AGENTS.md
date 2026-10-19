# api-processor — Agent Instructions

TypeScript library `@netcracker/qubership-apihub-api-processor`. It turns API source documents (REST/OpenAPI,
GraphQL, AsyncAPI, MCP, DDL, text) into a package version build result, compares versions (changelog), and
exports them. `build-task-consumer` and `ui` use it. Follow the root [`AGENTS.md`](../../AGENTS.md) and
[`frontend/AGENTS.md`](../AGENTS.md).

## Where the code is

| Area | Location |
|------|----------|
| Source | `src/` |
| Tests and helpers | `test/` (`test/helpers`) |
| Build asserts | `scripts/assert-light-entry-parser-free.mjs` (runs after `build`) |
| Build config | `vite.config.ts`, `jest.config.ts`, `vite.performance.config.ts` |

## Build and test

Nx project `api-processor`, from the repository root:

```bash
pnpm exec nx run api-processor:build
pnpm exec nx run api-processor:test
```

`build` runs `tsc` for CommonJS and `vite build`, then asserts that the light entry does not pull in the DDL
parser. The package has no `lint:check` script. `pnpm --filter @netcracker/qubership-apihub-api-processor run
test:disk` runs the tests against the disk file system.

## Traps

- Two entry points: the light root and `/processor`. The root must stay free of the DDL parser (about 1.1 MB of
  WASM); the post-build assertion fails otherwise.
- It depends on `api-diff`, `api-unifier`, `ddlapi`, `graphapi`, and `json-crawl` in the workspace.
- Output lists must be deterministic: a reordered list reads as a changed build after a migration.
- A broken document becomes a reported notification, not a thrown error that aborts the version.

## Agent packages

Local packages (`agent-packages/`):

- `api-processor-authoring` (two skills and rules for `**/*.ts`): `api-processor-build-result`, use when you add
  anything to a build result so lists stay in deterministic order; `api-processor-notifications`, use when you add
  a diagnostic or decide whether a failure aborts the build.
- `api-processor-testing` (skill and rule for `test/**/*.ts`): use when adding or changing tests, helpers, or
  fixtures.
- `api-processor-using` (skill and rule): use when you consume the library, here and in `ui`.

Packages from other modules whose `applyTo` reaches this module:

- `json-crawl-using`, `ddlapi-using` (skills and rules): use when you crawl JSON trees or handle DDL API
  documents.

Store packages: `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
`markdown-line-length-120` (always-on conventions and planning from a ticket).
