---
name: apihub-issue-analysis
description: Decide whether a Bug or Task issue of the qubership-apihub monorepo is suitable for an AI agent to implement end to end, unsuitable, or short of information, and draft a short plan. Use when asked to assess, triage, or analyze an issue of this repository for AI implementation. The AI Autonomous agent uses it in CI; people can use it the same way.
---

# Issue analysis for AI implementation (qubership-apihub)

The verdict tells a maintainer whether to type `/agent implement`. Judge what an agent in a GitHub Actions runner can
do with this repository alone: read and change the code, run the build and the unit tests, and open one pull request
that CI then checks. Nothing else.

## Procedure

1. Read the issue and every comment. Separate facts (observed behavior, logs, versions, steps) from wishes.
2. Find the code the issue is about: search for the names, messages, endpoints, and UI texts it mentions. Read the
   module's `AGENTS.md`. A bug you cannot locate in the code is not ready.
3. Decide the verdict with the table below.
4. For `suitable`, draft the plan. For `needs-info`, write the questions.

## Verdicts

| Verdict | When |
|---|---|
| `suitable` | The expected result is clear; the code is located; the change fits one pull request; the module's tests or a new test can show the change works |
| `needs-info` | One to a few answers would make it suitable: the expected behavior, steps to reproduce, the version or environment, which of two readings is meant |
| `unsuitable` | An answer would not help: a product or architecture decision that belongs to people, access the agent lacks (a production cluster, a customer's data, a third-party account), work outside this repository, a change across many modules that needs coordination, or a bug that only shows on a live installation and cannot be reproduced in a test |

When in doubt between `needs-info` and `unsuitable`, ask: would a maintainer's two-line answer let the agent proceed?
If yes, it is `needs-info`.

## The plan (for `suitable`)

- **Modules**: the modules the change touches, as named in `.github/labeler.yml` (`portal-backend`, `ui`, `api-diff`,
  ...).
- **Approach**: what to change and where, in two to five sentences, naming files or functions.
- **Tests**: the test that proves the fix (for a bug: the failing test to write first) and the module checks to run.
- **Risk**: `low`, `medium`, or `high` for the change itself.

## Questions (for `needs-info`)

Each question is one sentence the reporter can answer without reading code. Ask for what blocks the work, not for
what would be nice to know. Three questions at most is a good limit.
