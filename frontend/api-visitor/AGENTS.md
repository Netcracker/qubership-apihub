# api-visitor — Agent Instructions

TypeScript library `@netcracker/qubership-apihub-api-visitor`. It walks OpenAPI documents with the visitor pattern,
type-safe, and marks self loops with the `valueAlreadyVisited` flag so traversal never recurses forever. `ui` uses
it. Follow the root [`AGENTS.md`](../../AGENTS.md) and [`frontend/AGENTS.md`](../AGENTS.md).

## Where the code is

| Area | Location |
|------|----------|
| Source | `src/` |
| Tests | `test/` (Jest, `jest.config.ts`) |
| Build config | `vite.config.ts`, `tsconfig.json` |

## Build and test

Nx project `api-visitor`, from the repository root:

```bash
pnpm exec nx run api-visitor:build
pnpm exec nx run api-visitor:test
pnpm exec nx run api-visitor:lint:check
```

## Traps

- It depends on `api-unifier` and `json-crawl` in the workspace; `nx` builds them first.
- Self-loop handling is a contract with the callers; a change to `valueAlreadyVisited` changes `ui` behaviour.
- No local APM package: only the store conventions apply.

## Agent packages

Local packages: none. These packages reach this path:

- `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
  `markdown-line-length-120` (always-on conventions and planning from a ticket).

The `*-using` packages of `ddlapi` and `json-crawl` do not list this module in their `applyTo`; read
`json-crawl-using` by hand when you touch the crawl code.
