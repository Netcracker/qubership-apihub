# class-view — Agent Instructions

TypeScript library `@netcracker/qubership-apihub-class-view`: an interactive UML class diagram of entities and
their relationships, with auto layout, animated transitions, and selection. `ui` uses it. Follow the root
[`AGENTS.md`](../../AGENTS.md) and [`frontend/AGENTS.md`](../AGENTS.md).

## Where the code is

| Area | Location |
|------|----------|
| Source | `src/` |
| Storybook | `.storybook/` |
| Screenshot test configs | `.jest/integration/` |
| Coding rules and docs | `CODING_GUIDELINES.md`, `docs/` |

## Build and test

Nx project `class-view`, from the repository root:

```bash
pnpm exec nx run class-view:build
pnpm exec nx run class-view:lint:check
pnpm exec nx run class-view:screenshot-test
```

`build` runs `build:dist` (vite) and `build:showcase` (Storybook). `lint:check` runs `tsc` and ESLint. There is no
unit-test script; the screenshot suite is the test.

## Traps

- Screenshot tests need Chrome in a container (the `jest-chrome-in-docker-environment` workspace package). Do not
  regenerate snapshots on a different OS or browser; use `regenerate-screenshots` with the containerized config.
- The `feature-start` and `feature-finish` scripts come from the polyrepo flow. Do not use them here.
- No local APM package: only the store conventions apply.

## Agent packages

Local packages: none. These packages reach this path:

- `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
  `markdown-line-length-120` (always-on conventions and planning from a ticket).
