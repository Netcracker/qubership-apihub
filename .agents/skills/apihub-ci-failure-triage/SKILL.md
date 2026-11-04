---
name: apihub-ci-failure-triage
description: Read a failed CI run of the qubership-apihub monorepo and find what to fix - the failing job, step, project, and test, and whether the change caused it or the failure is unrelated or flaky. Use when asked why CI of a branch or pull request of this repository is red, or before fixing a CI failure. The AI Autonomous agent uses it in CI; people can use it the same way.
---

# Triage a red CI run (qubership-apihub)

The full guide for people is the section "Read a red run" of `docs/development/ci.md`; this skill is the short path
to a fix.

## Find the failure

1. **The verdict job `ci-ok`** names the jobs that are not ok. Ignore the rest.
2. **A skipped job that had to run** points at `plan`, not at your code.
3. **`js`, `go`, `java`** run Nx with `--verbose`: the failing target is printed with its command. Reproduce it with
   `pnpm exec nx run <project>:<target>`.
4. **`screenshot-tests`** fail on a changed rendering: the PNG diffs are the `screenshot-diffs-<project>` artifact.
   Update a baseline only when the change of rendering is the intended result.
5. **`e2e`**: a red step before the tests (for example "Wait for APIHUB to answer") means the stack did not start,
   which points at images, Helm, or configuration. A red verdict after green setup steps means a Newman or Playwright
   test failed: the reports name the request or the test.
6. **`Lint: Code base`** (super-linter) names the file, the line, and the rule. **`PR: Title`** and **`PR: Commit
   messages`** want Conventional Commits.

## Caused by the change, or not?

- The failing project or test is among those the change affects, or reads a file the change touches: the change.
- The same job fails on `develop` at the merge base, or the failure is a timeout, a network error, or a registry
  error: not the change. Say so instead of changing code.
- An E2E test that fails once and has no link to the change is likely flaky; one rerun settles it.

## Fix

Fix the cause in the code or the test the failure names, and run that target locally before you finish. Never skip,
delete, or loosen a test or a check to get green.
