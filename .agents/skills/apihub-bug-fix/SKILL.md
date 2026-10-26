---
name: apihub-bug-fix
description: Fix a bug of the qubership-apihub monorepo end to end - reproduce it with a failing test, make the smallest change that fixes it, and run the module's checks. Use when asked to fix a Bug issue of this repository. The AI Autonomous agent uses it in CI; people can use it the same way.
---

# Fix a bug (qubership-apihub)

A reviewer must be able to merge the fix after reading the diff once. That means a small diff, a test that failed
before the fix and passes after it, and nothing else.

## Procedure

1. **Locate.** Start from the analysis plan when you have one. Find the code path the issue describes and read the
   module's `AGENTS.md` and the skills it names (for Go in `backend/portal-backend`, `apihub-backend-developer`; for
   `frontend/api-diff`, `api-diff-authoring` and `api-diff-testing`; and so on).
2. **Reproduce.** Write the test that shows the bug, in the module's existing test style and location, and run it:
   it must fail for the reason the issue describes. When a test cannot show it (the bug lives in a deployment file, a
   workflow, or documentation), say so in the verification and check the change another way.
3. **Fix.** Change the least code that makes the test pass. Fix the cause, not the symptom: no catch-all error
   handling, no silent fallback, no special case for the test's input.
4. **Check.** Run the module's tests and build through Nx (`pnpm exec nx run <project>:test`, `:build`). Fix what you
   broke. Do not change unrelated tests to make them pass.
5. **Follow-ups in the same change.** A changed REST contract updates the OpenAPI file under the module's `docs/api/`
   and the Postman collections (`postman-e2e-followup`); a changed configuration key, environment variable, or port
   updates Helm, Compose, and `docs/configuration-reference.md` (`apihub-deployment-followup`); a new SQL migration
   follows the module's migration rule.

## Out of bounds

- Refactoring, renames, formatting, or dependency updates the fix does not need.
- Changing CI workflows under `.github/workflows/`: the agent's token cannot push them anyway.
- Weakening a test, a lint rule, or a check to get green.

When the fix needs any of these, or a decision the issue does not make, stop and report the work as blocked with the
reason. A clear "blocked because" is a good result; a wrong fix is not.

## Notes for the next attempt

End with what you tried, what you learned about the cause, and what you would try next. A later attempt, possibly by
another model, starts from these notes and from the CI report, not from your memory.
