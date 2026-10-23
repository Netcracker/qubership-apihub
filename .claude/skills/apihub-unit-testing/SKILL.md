---
name: apihub-unit-testing
description: "Decides which unit tests a change in frontend/ of the qubership-apihub monorepo owes and keeps them minimal: test only complex or critical logic, the smallest set that proves it, and no growth of the test scope. Tool-independent; the module's own *-testing skill gives the framework, files, and fixtures. Use when deciding whether a frontend change needs unit tests, or when writing, changing, or reviewing one."
---

# Unit tests in the frontend

This skill decides whether to test and how much. The tools, file names, fixtures, and commands of a module come from
its own `*-testing` skill (`api-diff-testing`, `api-processor-testing`, `api-doc-viewer-testing`, ...) and its
`AGENTS.md`; where they say more, they win.

## What deserves a test

Test logic whose failure would be hard to notice or costly:

- non-trivial transformations, parsing, mapping, comparison, and classification;
- branching on data: rules, state machines, reducers, permission and visibility decisions;
- a bug that was fixed: one regression test that fails without the fix;
- a contract other modules rely on: a library's public function, a builder's output shape.

Do not test:

- code without logic: constants, types, plain getters, prop passing, re-exports;
- the framework or a library: that React renders, that a query hook caches, that Lodash groups;
- styling, layout, and markup structure; the screenshot and end-to-end suites cover what the user sees;
- code the change did not touch.

## How many

Write the minimal set that proves the behaviour: the main case, then each boundary or branch that can break on its
own. A case that would fail together with an existing one adds nothing; leave it out. When an existing test
already covers the behaviour, extend it instead of adding a file.

The scope of a task's tests stays the scope of the task. Do not add tests for neighbouring code, refactor existing
tests, or raise coverage along the way; mention a gap you noticed instead.

## Each test

- One behaviour per test, named after it (`returns an empty diff for equal documents`).
- Exercise the public entry of the unit, not its private helpers, and assert on results, not on internal calls.
- Keep inputs small and inline, or reuse the module's fixtures; no new large fixture for one assertion.
- Deterministic: no real network, timers, or current date; no dependence on test order.
- Check that the test fails when the logic is broken, for example by reverting the fix once.
