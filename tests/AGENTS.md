# tests — Agent Instructions

Group of the end-to-end suites that run against a deployed stack. They hold no product code. Follow the root
[`AGENTS.md`](../AGENTS.md); the module files below add what is specific to each.

| Module | What it is | Instructions |
|--------|------------|--------------|
| `postman-collections` | Newman and Postman E2E collections for the portal backend API | [AGENTS.md](postman-collections/AGENTS.md) |
| `ui-tests` | Playwright UI tests for the Portal and Agents SPAs | [AGENTS.md](ui-tests/AGENTS.md) |

## Shared facts

- Both suites need a running APIHUB (Compose or Kind) and credentials; see the module README for the variables.
- CI runs them through `.github/workflows/e2e-tests-compose.yml`, `e2e-tests-kind.yml`, and
  `e2e-tests-manual.yml`. The Kind run takes about 45 minutes; do not poll it in a tight loop.
- A change to the REST contract of `backend/portal-backend` usually needs `postman-collections` updated; a change
  to visible UI behaviour in `frontend/ui` usually needs `ui-tests` updated.
- `ui-tests` is part of the pnpm workspace (`ui-tests` Nx project). `postman-collections` is not an Nx project.

## Agent packages

Local packages are in `postman-collections/agent-packages/`; the module file lists them. Store packages that apply
everywhere: `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
`markdown-line-length-120`.
