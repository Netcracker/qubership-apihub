# http-spec — Agent Instructions

TypeScript library `@netcracker/qubership-apihub-http-spec`, a fork of `@stoplight/http-spec`. It turns OpenAPI 2,
OpenAPI 3, and Postman collections into one HTTP AST; the fork stores diff data in the model. `apispec-view` and
`rest-playground` use it. Follow the root [`AGENTS.md`](../../AGENTS.md) and [`frontend/AGENTS.md`](../AGENTS.md).

## Where the code is

| Area | Location |
|------|----------|
| Source | `src/` |
| Build config | `tsconfig.build.json`; the build runs `sl-scripts build` |

## Build and test

Nx project `http-spec`, from the repository root:

```bash
pnpm exec nx run http-spec:build
```

The only test script is `test:skip` (`jest`), so Nx has no `test` target. Lint is `pnpm --filter
@netcracker/qubership-apihub-http-spec run lint` (the `lint.fix` script calls `npm lint` and does not work).

## Traps

- Fork of an upstream package: keep changes minimal and marked, so a future upstream merge stays possible.
- The `release` and `release.dryRun` scripts are from upstream. Releases go through the root Nx release flow.
- No local APM package: only the store conventions apply.

## Agent packages

Local packages: none. These packages reach this path:

- `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
  `markdown-line-length-120` (always-on conventions and planning from a ticket).
