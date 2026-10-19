# json-crawl — Agent Instructions

TypeScript library `@netcracker/qubership-apihub-json-crawl`: a maintained fork of `json-crawl` that crawls,
clones, and transforms JSON trees with path rules and hooks. Cycle detection is removed from the library (callers
own it) and an `afterHooksHook` lifecycle hook is added. Nearly every other frontend library depends on it. Follow
the root [`AGENTS.md`](../../AGENTS.md) and [`frontend/AGENTS.md`](../AGENTS.md).

## Where the code is

| Area | Location |
|------|----------|
| Source | `src/` |
| Tests | `test/` (Jest and ts-jest configured in `package.json`) |
| Build config | `vite.config.ts`, `tsconfig.json` |

## Build and test

Nx project `json-crawl`, from the repository root:

```bash
pnpm exec nx run json-crawl:build
pnpm exec nx run json-crawl:test
```

The package has no `lint:check` script. `pnpm --filter @netcracker/qubership-apihub-json-crawl run test:coverage`
adds coverage. Install once at the workspace root with `pnpm install`.

## Traps

- It has no workspace dependencies, so it builds first; a change here rebuilds `api-diff`, `api-unifier`,
  `api-processor`, `api-doc-viewer`, `api-visitor`, and `ui`.
- Import from the package root only in consumer code; tests import from relative `src`.
- Callers own cycle detection. Do not add it back in the library.

## Agent packages

Local packages (`agent-packages/`):

- `json-crawl-authoring` (skill and rule for `src/**/*.ts`): use when changing crawl, clone, or transform
  behaviour, the hook lifecycle, path rules, or exported utilities.
- `json-crawl-testing` (skill and rule for `test/**/*.ts`): use when adding or changing unit tests.
- `json-crawl-using` (skill and rule): use when you consume the library. Its `applyTo` also reaches `api-diff`,
  `api-doc-viewer`, `api-processor`, `api-unifier`, and `ui`.

Store packages: `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
`markdown-line-length-120` (always-on conventions and planning from a ticket).
