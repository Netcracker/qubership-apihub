# Frontend agent packages

APM packages for the frontend of the **qubership-apihub** monorepo. They live in `frontend/ui`, the module that uses
every frontend technology, and their `applyTo` globs name every module a package applies to. The coding conventions
of the frontend are the skills in these packages.

## Packages

| Package | Contents | Applies to |
|---------|----------|------------|
| `apihub-ui-authoring` | Module layout, files, imports, prop names and hover classes, wire types, `/api` hooks, request errors and notifications | `frontend/ui` |
| `apihub-typescript-coding` | Types, naming, functions, imports, file organization | TypeScript in `frontend/` and `tests/ui-tests/` |
| `apihub-react-coding` | React 18 components, rendering, styling per module, test IDs, accessibility | `*.tsx` and `use*.ts` hooks in `frontend/` |
| `apihub-mui-coding` | MUI 5 styling, composition, icons, and buttons | `frontend/ui`, `frontend/rest-playground` |
| `apihub-unit-testing` | When a change owes unit tests and how few are enough, independent of the test tool | `frontend/` |
| `apihub-frontend-gates` | Rule to validate a change; skill `apihub-frontend-gates` with `scripts/validate.mjs` | `frontend/`, `tests/ui-tests/` |
| `apihub-agents-claude`, `apihub-agents-cursor`, `apihub-agents-opencode` | `frontend-verifier` on `haiku` (Claude Code), on `composer-2.5` (Cursor), or on the model of the session (OpenCode) | |

APM copies an agent verbatim to every target, so each verifier package declares `targets:` and ships one harness.
Shell commands that break the pnpm workspace are denied in `.claude/settings.json` and `opencode.json` and steered
against in `.cursor/permissions.json`; these files are hand-written, not deployed by APM.

`apihub-frontend-gates` formats the touched files that are new on the branch with `dprint`, then runs ESLint with
`--fix`, the type check, and the related unit tests. `dprint` is expected on `PATH` with a global configuration
(`dprint init --global`); without one, the format gate is skipped.

The root `apm.yml` lists these packages. After edits, run from the repository root:

```bash
apm install
```
