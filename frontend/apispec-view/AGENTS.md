# apispec-view — Agent Instructions

Workspace for the web component that renders an OpenAPI specification: a fork of `@stoplightio/elements`, with JSON
Schema and JSON Schema diff rendering through `api-doc-viewer`. `ui` embeds it. Follow the root
[`AGENTS.md`](../../AGENTS.md) and [`frontend/AGENTS.md`](../AGENTS.md).

## Where the code is

Nx project names are in parentheses. Everything below `packages/`:

| Package | Role |
|---------|------|
| `elements` (`apispec-view`) | The web component and its build, Storybook, and screenshot tests |
| `elements-core` | Core rendering components |
| `diff-elements-core`, `diff-block` | Diff rendering |
| `json-schema-viewer`, `json-schema-diff-viewer` | JSON Schema viewers |
| `samples` | Sample documents |

The root `package.json` (`apispec-view-root`) holds shared dev dependencies and no scripts.

## Build and test

Run from the repository root:

```bash
pnpm exec nx run apispec-view:build
pnpm exec nx run apispec-view:type-check
pnpm exec nx run apispec-view:screenshot-test
```

`build` runs webpack for the web component and then PostCSS for the styles. `screenshot-test` builds Storybook,
serves it on port 9009, generates the tests, and runs Jest. `regenerate-screenshots` updates the snapshots.

## Traps

- Screenshot tests need Chrome in a container (`jest-chrome-in-docker-environment`). Regenerate snapshots only
  with the containerized config.
- Depends on `api-diff`, `api-doc-viewer`, `api-unifier`, `http-spec`, and `compatibility-suites`; a change in those
  can change the snapshots.
- It is a fork: keep changes to upstream files small and marked.
- No local APM package: only the store conventions apply. The `api-doc-viewer-*` packages do not reach this path.

## Agent packages

Local packages: none. These packages reach this path:

- `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
  `markdown-line-length-120` (always-on conventions and planning from a ticket).
