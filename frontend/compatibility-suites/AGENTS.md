# compatibility-suites — Agent Instructions

TypeScript package `@netcracker/qubership-apihub-compatibility-suites`: a catalogue of the most important API
change cases (OpenAPI, GraphQL, AsyncAPI), each with a `before` and an `after` document, for classifying changes.
`api-diff` tests and the `api-doc-viewer` and `apispec-view` story generators read it. Follow the root
[`AGENTS.md`](../../AGENTS.md) and [`frontend/AGENTS.md`](../AGENTS.md).

## Where the code is

| Area | Location |
|------|----------|
| Case data | `bin/comparison-base-suite/<suiteType>/<suiteId>/<testId>` |
| Shared schema fragments | `bin/comparison-base-suite/schemas/json-schema/<testId>/` |
| Generator | `bin/generate-suite-data.ts` |
| Generated output and entry | `generated/`, `src/`, `index.ts` |

The structure of cases (`metadata.yaml` version matrix, template-rendered schema suites with one `__SCHEMA__`
placeholder) is described in `README.md`.

## Build and test

Nx project `compatibility-suites`, from the repository root:

```bash
pnpm exec nx run compatibility-suites:build
pnpm exec nx run compatibility-suites:type-check
```

`build` runs `generate` first (`tsx bin/generate-suite-data.ts`) and then vite. There is no test script; the
consumers test against it.

## Traps

- Adding or changing a case changes the expected results of `api-diff` tests and the generated stories and
  screenshot tests of `api-doc-viewer` and `apispec-view`. Run those after the change.
- Only OAS `3.0.x` and `3.1.x` are accepted in `version_combinations`.
- The `*.generated.*` files are produced; do not edit them by hand.

## Agent packages

Local packages: none. These packages reach this path:

- `api-diff-testing` and `api-doc-viewer-testing` (skills, other modules): read them by hand before changing
  cases, because they set the fixture conventions the consumers expect. Their `applyTo` does not reach this path.
- `development-conventions`, `github-ticket-implementation-planner`, `english-developer-style`,
  `markdown-line-length-120` (always-on conventions and planning from a ticket).
