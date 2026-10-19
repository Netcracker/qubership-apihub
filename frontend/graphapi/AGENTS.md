# graphapi — Agent Instructions

TypeScript library `@netcracker/qubership-apihub-graphapi`. It converts a GraphQL schema into a GraphAPI document
(a JSON Schema based alternative to GraphQL introspection) and back. A modified fork of `udamir/graphapi`: the
structure follows GraphQL specifics and nullability handling is changed. Follow the root
[`AGENTS.md`](../../AGENTS.md) and [`frontend/AGENTS.md`](../AGENTS.md).

## Where the code is

| Area | Location |
|------|----------|
| Source | `src/` |
| Tests | `test/` (Jest) |
| Build config | `vite.config.ts`; Storybook and webpack configs for the showcase and the web build |

## Build and test

Nx project `graphapi`, from the repository root:

```bash
pnpm exec nx run graphapi:build
pnpm exec nx run graphapi:test
pnpm exec nx run graphapi:lint:check
```

`build:showcase` builds Storybook and is not cached. `build:web` runs webpack.

## Traps

- It has no workspace dependencies; `api-diff`, `api-unifier`, `api-processor`, `api-doc-viewer`, and `ui` depend
  on it, so a change rebuilds them.
- The `feature-start` and `feature-finish` scripts come from the polyrepo flow. Do not use them here.
- No local APM package: only the store conventions apply.

## Agent packages

Local packages: none. These packages reach this path:

- `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
  `markdown-line-length-120` (always-on conventions and planning from a ticket).

The `*-using` packages of `ddlapi` and `json-crawl` do not list this module in their `applyTo`.
