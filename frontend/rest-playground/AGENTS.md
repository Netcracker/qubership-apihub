# rest-playground — Agent Instructions

TypeScript and React library `@netcracker/qubership-apihub-rest-playground`: a UI component for trying REST
operations with real data. It builds request parameters from the API specification. It is meant for REST only.
`ui` uses it, and it depends on `http-spec`. Follow the root [`AGENTS.md`](../../AGENTS.md) and
[`frontend/AGENTS.md`](../AGENTS.md).

## Where the code is

| Area | Location |
|------|----------|
| Source | `src/` |
| Type shims | `typings/` |
| Storybook and unit tests | `.storybook/`, `.jest/unit-tests/` |
| Build config | `webpack.web-components.config.js`, `webpack.hooks.config.js`, `postcss.config.js` |

## Build and test

Nx project `rest-playground`, from the repository root:

```bash
pnpm exec nx run rest-playground:build
pnpm exec nx run rest-playground:test
```

`build` runs three steps: web components, hooks, and styles. `pnpm --filter
@netcracker/qubership-apihub-rest-playground run lint` runs ESLint; `storybook` starts Storybook on port 9001.

## Traps

- The `.nvmrc` here (`lts/*`) is a leftover of the polyrepo. The workspace uses the Node and pnpm versions of the
  root `package.json` and CI.
- The webpack outputs are consumed by `ui`; a change to the exported hooks or web component API needs `ui` checked.
- No local APM package: only the store conventions apply.

## Agent packages

Local packages: none. These packages reach this path:

- `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
  `markdown-line-length-120` (always-on conventions and planning from a ticket).
