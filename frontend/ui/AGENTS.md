# ui — Agent Instructions

React and TypeScript single-page applications of APIHUB: the Portal (API Registry UI) and the Agents SPA. Both
share components from `packages/shared`. Each SPA also has a small Node server (`server/`).
Follow the root [`AGENTS.md`](../../AGENTS.md) and [`frontend/AGENTS.md`](../AGENTS.md).

## Where the code is

Nx project names are in parentheses.

| Area | Location |
|------|----------|
| Portal SPA and server (`ui-portal`) | `packages/portal/` (`src/`, `server/`) |
| Agents SPA and server (`ui-agents`) | `packages/agents/` (`src/`, `server/`) |
| Shared components, Storybook (`ui-shared`) | `packages/shared/` |
| Workspace root (`ui-root`) | `package.json`, `.eslintrc.json`, `Dockerfile`, `Dockerfile.local` |
| Coding rules, user guides, dev docs | `docs/dev/CODING_GUIDELINES.md`, `docs/dev/`, `docs/*.md` |

## Build and test

From the repository root:

```bash
pnpm exec nx run ui-portal:build
pnpm exec nx run ui-agents:build
pnpm exec nx run ui-shared:test
pnpm exec nx run ui-portal:test:server
pnpm exec nx run ui-portal:lint:check
```

Dev servers: `pnpm --filter @netcracker/qubership-apihub-ui-portal run dev:proxy` (Vite against a running
backend) or `dev:proxy:msw` (mock service worker). Run `pnpm --filter @netcracker/qubership-apihub-ui run
msw:init` once to create the mock worker files. Portal `build` runs `tsc` and `vite build` with a large heap.

## Traps

- It uses nearly every TypeScript library of the monorepo (`api-processor`, `api-diff`, `api-doc-viewer`,
  `apispec-view`, `class-view`, `rest-playground`, and others); `nx` builds them first, so a cold build is long.
- Do not run `npm install` here. Install once at the workspace root with `pnpm install`.
- The ports and proxy targets of the dev servers must match your backend (`docs/dev/local-development.md`).
- UI end-to-end tests live in `tests/ui-tests`; a change to visible behaviour usually needs them updated.

## Agent packages

Local package (`agent-packages/`):

- `apihub-ui-authoring` (rule for `frontend/ui/**/*.{ts,tsx}`): points to `docs/dev/CODING_GUIDELINES.md`; it
  applies whenever you edit UI source.

Packages from other modules whose `applyTo` reaches this module:

- `api-processor-using` (skill and rule): use when the UI builds, compares, or exports package versions.
- `api-doc-viewer-using` (skill and rule): use when the UI embeds the API document viewers.
- `json-crawl-using`, `ddlapi-using` (skills and rules): use when the UI crawls JSON trees or handles DDL API
  documents.

Store packages: `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
`markdown-line-length-120` (always-on conventions and planning from a ticket).
