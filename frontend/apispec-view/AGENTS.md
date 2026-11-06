# apispec-view — Agent Instructions

Workspace for `<apispec-view>`, the web component that renders a whole OpenAPI document: a fork of
`@stoplightio/elements`. `ui` embeds it for the document preview and the specification dialog, and the Portal serves
its bundle at `/portal/apispec-view/index.js` for the "Copy page template" snippet. Single operations and comparisons
are rendered by `api-doc-viewer`, not here. Follow the root
[`AGENTS.md`](../../AGENTS.md) and [`frontend/AGENTS.md`](../AGENTS.md).

## Where the code is

Nx project names are in parentheses. Everything below `packages/`:

| Package | Role |
|---------|------|
| `elements` (`apispec-view`) | The web component, its build, and its Storybook |
| `elements-core` | Layouts, documentation pages, Try It |
| `json-schema-viewer` | JSON Schema viewer used by `elements-core` |

The root `package.json` (`apispec-view-root`) holds shared dev dependencies and no scripts.

## Build and test

Run from the repository root:

```bash
pnpm exec nx run apispec-view:build
pnpm exec nx run apispec-view:type-check
```

`build` runs webpack for the web component and then PostCSS for the styles. The module has no automated tests; check a
change in the `web-components/API` stories (`pnpm exec nx run apispec-view:development:storybook`).

## Traps

- The element's properties are a public contract: the Portal embed snippet sets `apiDescriptionUrl`,
  `layout="stacked"`, and `hideExport`, and the HTML export templates set `apiDescriptionDocument`.
- Only OpenAPI 2.0, 3.0, and 3.1 documents are supported; AsyncAPI support was removed.
- `type-check` fails on the base branch too (implicit `any` and missing declarations in `elements-core`,
  `json-schema-viewer`, and `elements`). Compare the error list against the base branch: a change must not add errors.
- Depends on `api-unifier` and `http-spec` only. It renders JSON Schema with its own `json-schema-viewer`, not with
  `api-doc-viewer`.
- It is a fork: keep changes to upstream files small and marked.
- No local APM package: only the store conventions apply. The `api-doc-viewer-*` packages do not reach this path.

## Agent packages

Local packages: none. These packages reach this path:

- `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
  `markdown-line-length-120` (always-on conventions and planning from a ticket).
