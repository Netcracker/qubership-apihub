---
name: apihub-validate
description: "Runs the quality gates on the files a change touched in frontend/ and tests/ui-tests/ (dprint for files new on the branch, ESLint with --fix, the type check, and the unit tests related to them) with one command, and reports the result per package. Use before a commit or a pull request, when finishing a frontend task, or when the user asks to validate, lint, type-check, or test the change."
---

# Validate the touched files

One command runs every gate. Do not run dprint, ESLint, `tsc`, or the test runner by hand for this, and do not run a
whole-module `lint:check` or `nx affected`: they are slow and report problems the change did not cause.

## Command

The script is `scripts/validate.mjs` in this skill's directory. The committed copy is
`.agents/skills/apihub-validate/`. Run it from the repository root with the files you created or changed:

```bash
node .agents/skills/apihub-validate/scripts/validate.mjs --files <path> <path> ...
```

- Run it as one command: do not prefix it with `cd`, and do not run `git status` or Nx yourself.
- Without `--files`, the script checks every file changed since the merge base with `develop` plus untracked files,
  which can include work that is not yours.
- `--scope format|lint|typecheck|test` runs one gate; `--base <ref>` changes the base branch.
- Formatting is dprint only: do not fall back to Prettier, a module's `format` script, or an IDE formatter, even
  where a module has a Prettier config (`build-task-consumer`, `http-spec`).
- The format and lint gates rewrite files (`dprint fmt`, `eslint --fix`), so re-read a file before editing it
  again.

## Gates

| Gate | What it runs |
|---|---|
| `format` | `dprint fmt` on the touched files that do not exist in `origin/develop` (or `develop`); files that exist there keep their formatting |
| `lint` | `pnpm exec eslint --fix` on the touched files of each package, then reports what remains |
| `typecheck` | `pnpm exec tsc --noEmit` for the nearest `tsconfig.json`; fails only on errors in touched files |
| `test` | the project's `test` target through Nx with only the tests related to the touched files (`--findRelatedTests`, so a Jest-based `test` script for now); Nx builds the workspace dependencies first |

dprint is expected on `PATH` with a configuration it finds above the repository or a global one
(`dprint init --global`); otherwise the format gate is skipped with the reason. Sources of `ui-portal` and
`ui-agents` run in the `ui-shared` unit-test suite, and the dev servers in
`ui-portal:test:server`. A package without ESLint, or whose `test` script cannot select related tests, is reported
as `SKIP` with the reason; Playwright specs in `tests/ui-tests` run as its `AGENTS.md` says.

## Report

One block per package:

```text
project: ui-portal (frontend/ui/packages/portal)
files: 2
format: SKIP no file of the package is new against origin/develop
lint: PASS pnpm exec eslint --fix (2 files in frontend/ui/packages/portal)
typecheck: FAIL pnpm exec tsc --noEmit -p frontend/ui/packages/portal/tsconfig.json
test: PASS pnpm exec nx run ui-shared:test -- --findRelatedTests (1 files)
remaining:
  frontend/ui/packages/portal/src/App.tsx(12,3): error TS2322: ...
```

As the `verifier` subagent, return these blocks unchanged. Otherwise fix what `remaining` lists and run the command
again. The exit code is 1 when a gate failed and 2 when there was nothing to check.
