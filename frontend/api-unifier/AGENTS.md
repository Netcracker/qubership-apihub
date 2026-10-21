# api-unifier — Agent Instructions

TypeScript library `@netcracker/qubership-apihub-api-unifier`. It normalizes OpenAPI, AsyncAPI, JSON Schema, and
GraphAPI documents into a canonical form so that semantically equal documents compare equal (for `api-diff`), and
denormalizes them back for readable output. Follow the root [`AGENTS.md`](../../AGENTS.md) and
[`frontend/AGENTS.md`](../AGENTS.md).

## Where the code is

| Area | Location |
|------|----------|
| Engine, rules, unify functions | `src/` |
| Tests by spec family | `test/oas/`, `test/asyncapi/`, `test/graphql/`, helpers in `test/helpers/` |
| Build config | `vite.config.ts`, `tsconfig.json`, `tsconfig.test.json` |

## Build and test

Nx project `api-unifier`, from the repository root:

```bash
pnpm exec nx run api-unifier:build
pnpm exec nx run api-unifier:test
pnpm exec nx run api-unifier:lint:check
```

`pnpm --filter @netcracker/qubership-apihub-api-unifier run test:coverage` adds coverage. Install once at the
workspace root with `pnpm install`.

## Traps

- It depends on `json-crawl`, `ddlapi`, and `graphapi` in the workspace; `nx` builds them first.
- Consumers: `api-diff`, `api-processor`, `api-visitor`, `api-doc-viewer`, `apispec-view`, `build-task-consumer`,
  and `ui`. A change in normalized output changes diff results everywhere.
- Import the engine from the package root in tests, not from deep paths.

## Agent packages

Local packages (`agent-packages/`):

- `api-unifier-authoring` (skill and rule for `src/**/*.ts`): use when adding normalization rules, unify
  functions, default and replace mappings, or validators.
- `api-unifier-testing` (skill and rule for `test/**/*.ts`): use when writing or changing normalize and
  denormalize tests.

Packages from other modules whose `applyTo` reaches this module:

- `json-crawl-using` (skill and rule): use when you crawl or clone JSON trees.
- `ddlapi-using` (skill and rule): use when you handle DDL API documents.

Store packages: `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
`markdown-line-length-120` (always-on conventions and planning from a ticket).
