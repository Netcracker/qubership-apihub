# frontend — Agent Instructions

Group of the TypeScript modules: the SPAs, the builder service, and the libraries they share. One pnpm workspace
(`pnpm-workspace.yaml`: `frontend/*`, `frontend/*/packages/*`) with one `pnpm-lock.yaml`. Follow the root
[`AGENTS.md`](../AGENTS.md); the module files below add what is specific to each module.

| Module | What it is | Instructions |
|--------|------------|--------------|
| `ui` | Portal and Agents SPAs, shared components | [AGENTS.md](ui/AGENTS.md) |
| `build-task-consumer` | NestJS service that builds package versions | [AGENTS.md](build-task-consumer/AGENTS.md) |
| `api-processor` | Builds, compares, and exports package versions | [AGENTS.md](api-processor/AGENTS.md) |
| `api-diff` | Compares API documents and classifies changes | [AGENTS.md](api-diff/AGENTS.md) |
| `api-unifier` | Normalizes API documents | [AGENTS.md](api-unifier/AGENTS.md) |
| `api-visitor` | Visitor over OpenAPI documents | [AGENTS.md](api-visitor/AGENTS.md) |
| `api-doc-viewer` | React viewers for API documents and their data model | [AGENTS.md](api-doc-viewer/AGENTS.md) |
| `apispec-view` | OpenAPI web component (Stoplight fork) | [AGENTS.md](apispec-view/AGENTS.md) |
| `http-spec` | HTTP AST from OpenAPI and Postman (Stoplight fork) | [AGENTS.md](http-spec/AGENTS.md) |
| `rest-playground` | UI component to try REST operations | [AGENTS.md](rest-playground/AGENTS.md) |
| `class-view` | UML class diagram component | [AGENTS.md](class-view/AGENTS.md) |
| `ddlapi` | PostgreSQL DDL model and parser | [AGENTS.md](ddlapi/AGENTS.md) |
| `graphapi` | GraphQL to GraphAPI conversion | [AGENTS.md](graphapi/AGENTS.md) |
| `json-crawl` | JSON crawl, clone, and transform engine | [AGENTS.md](json-crawl/AGENTS.md) |
| `compatibility-suites` | Catalogue of API change cases | [AGENTS.md](compatibility-suites/AGENTS.md) |

## Shared facts

- Install once at the repository root with `pnpm install`. Never run `npm install` in a module: it writes a second
  lock file and resolves `workspace:` ranges from the registry. Scripts run with `pnpm run`, not `npm run`.
- Nx project names are the directory names, except `ui` (`ui-root`, `ui-portal`, `ui-agents`, `ui-shared`),
  `api-doc-viewer` (`api-doc-viewer-root` and `api-doc-viewer-<package>`), and `apispec-view` (`apispec-view` is
  `packages/elements`, the rest are `apispec-view-<package>`). The names are set by `nx.name` in `package.json`.
- Run targets from the repository root: `pnpm exec nx run <project>:build`, `<project>:test`,
  `<project>:lint:check`. A target exists only if the module declares the script; each module file says which.
- Dependency order (low to high): `json-crawl`, `ddlapi`, `graphapi`, `compatibility-suites` → `api-unifier` →
  `api-diff` → `api-processor`, `api-doc-viewer` → `apispec-view`, `build-task-consumer`, `ui`. `nx` builds
  dependencies first (`^build`).
- Screenshot suites (`api-doc-viewer`, `apispec-view`, `class-view`) need Chrome in a container; regenerate
  snapshots only with the containerized config.

## Agent packages

Local packages live in each library's `agent-packages/` (`api-diff`, `api-doc-viewer`, `api-processor`,
`api-unifier`, `ddlapi`, `json-crawl`) and in `ui/agent-packages/`; the module files list them. The `*-using`
packages (`json-crawl-using`, `ddlapi-using`, `api-processor-using`, `api-doc-viewer-using`) name their consumer
modules in `applyTo`, so they also apply in `api-diff`, `api-unifier`, `api-doc-viewer`, and `ui` as each module
file states. Store packages that apply everywhere: `development-conventions`,
`github-ticket-implementation-planner`, `english-developer-style`, `markdown-line-length-120`.
