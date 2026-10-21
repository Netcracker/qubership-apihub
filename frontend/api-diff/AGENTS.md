# api-diff — Agent Instructions

TypeScript library `@netcracker/qubership-apihub-api-diff`. It compares two API documents (OpenAPI, AsyncAPI,
GraphQL as GraphAPI, DDL API) and returns merged documents with classified changes: severity, action, scope. The
changelog of API Registry versions and the diff viewers use it. Follow the root [`AGENTS.md`](../../AGENTS.md) and
[`frontend/AGENTS.md`](../AGENTS.md).

## Where the code is

| Area | Location |
|------|----------|
| Source (classify rules, classifiers, adapters) | `src/` |
| Tests | `test/` (including `test/compatibility-suites` and `test/human-readable`) |
| Build config | `vite.config.ts`, `tsconfig.build.json`; performance build in `vite.performance.config.ts` |

## Build and test

Nx project `api-diff`, from the repository root:

```bash
pnpm exec nx run api-diff:build
pnpm exec nx run api-diff:test
pnpm exec nx run api-diff:lint:check
```

The scripts `test:compatibility-suites` and `test:human-readable` run subsets (`pnpm --filter
@netcracker/qubership-apihub-api-diff run test:human-readable`). Install once at the workspace root with
`pnpm install`; do not run `npm install` here.

## Traps

- It depends on `api-unifier`, `json-crawl`, `ddlapi`, `graphapi`, and `compatibility-suites` in the workspace. `nx`
  builds them first (`^build`); a stale `dist` of a dependency gives confusing type errors.
- Consumers: `api-processor`, `api-doc-viewer` (and its `next-data-model`), `apispec-view`, and `ui`. A change to
  the result shape needs those updated.
- Every new rule needs a test for each spec type it affects; see `api-diff-testing`.

## Agent packages

Local packages (`agent-packages/`):

- `api-diff-authoring` (skill and rule for `src/**/*.ts`): use when adding or changing classify rules,
  classifiers, response-scope handling, or adapters.
- `api-diff-testing` (skill and rule for `test/**/*.test.ts`): use when writing or changing diff tests and
  fixtures.

Packages from other modules whose `applyTo` reaches this module:

- `json-crawl-using` (skill and rule): use when you crawl or clone JSON trees with `json-crawl`.
- `ddlapi-using` (skill and rule): use when you handle DDL API documents.

Store packages: `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
`markdown-line-length-120` (always-on conventions and planning from a ticket).
