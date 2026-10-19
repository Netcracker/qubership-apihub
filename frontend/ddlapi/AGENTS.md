# ddlapi — Agent Instructions

TypeScript library `@netcracker/qubership-apihub-ddlapi`. It parses PostgreSQL DDL into a driver-neutral schema
model (`Realm`, `Schema`, `Table`), a TypeScript port of the Atlas Go schema model, and builds the model by hand
with factories. `api-diff`, `api-unifier`, `api-processor`, and `api-doc-viewer` use it. Follow the root
[`AGENTS.md`](../../AGENTS.md) and [`frontend/AGENTS.md`](../AGENTS.md).

## Where the code is

| Area | Location |
|------|----------|
| Model and parser | `src/` |
| Tests and SQL fixtures | `test/` |
| Build asserts | `scripts/assert-model-entry-parser-free.mjs` (runs after `build`) |
| Build config | `vite.config.ts`, `vite.browser.config.ts`, `vite-libpg-query-inline-wasm.plugin.ts` |

## Build and test

Nx project `ddlapi`, from the repository root:

```bash
pnpm exec nx run ddlapi:build
pnpm exec nx run ddlapi:test
```

`pnpm --filter @netcracker/qubership-apihub-ddlapi run typecheck` runs `tsc --noEmit`. The package has no
`lint:check` script.

## Traps

- Two entry points: the model root and `/parser`. The model root must stay free of the parser (WASM); the
  post-build assertion fails otherwise.
- `maxWorkers: 1` in the Jest setup is mandatory. Do not raise it.
- The model layer stays driver-neutral; PostgreSQL specifics live only in the parser.
- It has no workspace dependencies, so it builds early; consumers rebuild on any change.

## Agent packages

Local packages (`agent-packages/`):

- `ddlapi-authoring` (skill and rule for `src/**/*.ts`): use when changing types, factories, parser handlers, or
  resolution logic.
- `ddlapi-testing` (skill and rule for `test/**`): use when adding or changing tests, SQL fixtures, or the
  exhaustiveness check.
- `ddlapi-using` (skill and rule): use when you consume the library. Its `applyTo` also reaches `api-diff`,
  `api-doc-viewer`, `api-processor`, `api-unifier`, and `ui`.

Store packages: `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
`markdown-line-length-120` (always-on conventions and planning from a ticket).
