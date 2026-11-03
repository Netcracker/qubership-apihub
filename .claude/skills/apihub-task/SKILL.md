---
name: apihub-task
description: Carry out a Task issue of the qubership-apihub monorepo end to end - turn it into checkable done criteria, make the change, pick the Conventional Commit type, and run the module's checks. Use when asked to implement a Task issue (a refactoring, a chore, a documentation, CI, or build change, a small feature) of this repository. The AI Autonomous agent uses it in CI; people can use it the same way.
---

# Carry out a task (qubership-apihub)

A task issue says what to achieve, rarely how to check it. Start by writing that check down.

## Procedure

1. **Done criteria.** From the issue and the analysis plan, write two to five criteria a reviewer can verify: a test
   that passes, a command whose output changes, a file that exists or no longer exists, a page that says something.
   Each one goes into the verification of your result.
2. **Locate.** Read the module's `AGENTS.md` and the skills it names before changing its code.
3. **Change.** Do what the criteria need and nothing more. Follow the module's conventions; the nearest similar code
   is the best template.
4. **Check.** Run the module's tests and build through Nx (`pnpm exec nx run <project>:test`, `:build`). For a
   documentation change, follow `english-developer-style` and `markdown-line-length-120`, and keep links resolvable.
5. **Follow-ups in the same change**, as for a bug: OpenAPI and Postman for a REST change, Helm, Compose, and
   `docs/configuration-reference.md` for configuration, the migration rule for SQL.

## The commit type

The type decides the version bump of every component the change touches (see `docs/development/workflow.md`):

| Change | Type |
|---|---|
| new behavior a user or a client can see | `feat` |
| internal restructuring, same behavior | `refactor` |
| faster, same behavior | `perf` |
| tooling, housekeeping, dependency or build files | `chore` or `build` |
| CI workflows or CI scripts | `ci` |
| documentation only | `docs` |
| tests only | `test` |

The scope is the module name, as in its `module:<name>` label; leave it empty when the change spans several modules.

## Out of bounds

The same as for a bug: no unrelated refactoring or formatting, no changes under `.github/workflows/`, no weakened
checks. When the task needs a decision the issue does not make, report it as blocked with the question.

## Notes for the next attempt

End with what you did, what is left, and what you would try next if CI fails.
