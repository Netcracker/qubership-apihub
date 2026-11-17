# Design

Developer-facing design for the api-doc-viewer monorepo: requirements, display baselines,
architecture, feature designs, and review notes. **This folder is the source of truth.** Agent
skills under `agent-packages/` derive from it; when a skill or the code disagrees with a design
document, fix the disagreement explicitly — update the design first if the implementation is the
approved behaviour.

## Layout

Every API type folder has the same shape. A file or folder exists only when there is content for
it.

```text
docs/design/
  README.md
  shared/                       API-type-agnostic contracts and abstract diagrams
    architecture/
    features/
  <api-type>/                   async-api · ddlapi · jso · json-schema · graphql (legacy)
    display-coverage.md         what is shown today, what is omitted on purpose
    architecture/               four diagrams, same file names everywhere:
      data-model-plain.md
      data-model-with-diffs.md
      viewer-plain.md
      viewer-with-diffs.md
    entities/                   one file per domain entity (when the API type has a product design)
    features/                   one file per isolated feature
    notes/                      dated review and decision notes: <yyyy-mm>-<topic>.md
```

## Index

| Area | Coverage | Architecture | Entities | Features | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared | — | [architecture/](shared/architecture/) | — | [lazy materialization](shared/features/lazy-materialization.md), [hiding unchanged nodes](shared/features/hiding-unchanged-nodes.md), [section header colorizing](shared/features/section-header-colorizing.md), [color config](shared/features/color-config.md), [arrow scroll strip](shared/features/arrow-scroll-strip.md), [selector options are nested nodes](shared/features/selector-options.md), [CSS isolation](shared/features/css-isolation.md), [display mode: annotations](shared/features/display-mode-annotations.md) | — |
| JSO | — | — | — | [diffs specification](jso/features/diffs.md), [hiding unchanged nodes](jso/features/hiding-unchanged-nodes.md) | — |
| JSON Schema | [display-coverage.md](json-schema/display-coverage.md) | [architecture/](json-schema/architecture/) | — | [validation rows](json-schema/features/validation-rows.md), [meta flags and required](json-schema/features/meta-flags-and-required.md), [nesting-indicator row diffs](json-schema/features/nesting-indicator-row-diffs.md), [hiding unchanged nodes](json-schema/features/hiding-unchanged-nodes.md), [node key rename](json-schema/features/node-key-rename.md) | [2026-09 review](json-schema/notes/2026-09-architecture-review.md) |
| AsyncAPI | [display-coverage.md](async-api/display-coverage.md) | [architecture/](async-api/architecture/) | — | — | — |
| OpenAPI — start at [openapi/README.md](openapi/README.md) | [display-coverage.md](openapi/display-coverage.md) | [architecture/](openapi/architecture/) | [operation](openapi/entities/operation.md), [security](openapi/entities/security.md), [parameters](openapi/entities/parameters.md), [request body](openapi/entities/request-body.md), [responses](openapi/entities/responses.md) | [operation viewer](openapi/features/operation-viewer.md), [diffs](openapi/features/diffs.md), [OAS 3.0 / 3.1](openapi/features/oas-versions.md), [response-code selector](openapi/features/response-code-selector.md), [plain case matrix](openapi/features/plain-case-matrix.md), [diffs case matrix](openapi/features/diffs-case-matrix.md), [compatibility suite](openapi/features/compatibility-suite.md), [document viewer and portable bundle (planned)](openapi/features/document-viewer.md) | [2026-10 design analysis](openapi/notes/2026-10-design-analysis.md), [2026-10 implementation decisions](openapi/notes/2026-10-implementation-decisions.md), [2026-10 compatibility-suite port TODO](openapi/notes/2026-10-compatibility-suite-port-todo.md) |
| DDL API | [display-coverage.md](ddlapi/display-coverage.md) | [architecture/](ddlapi/architecture/) | [entities/](ddlapi/entities/) | [doc view](ddlapi/features/doc-view.md) | — |
| GraphQL (legacy) | — | [architecture/](graphql/architecture/) | — | — | — |

## Conventions

- **Names.** API type folders use the code's spelling (`async-api`, `ddlapi`, `jso`,
  `json-schema`). Files are kebab-case nouns; the same concept has the same filename in every
  API type.
- **Headings.** Coverage documents share the top-level headings `Sources`, `Scope`, `Pipeline`,
  `Classification tags`, `Displayed (plain)`, `Displayed (with diffs)`, `Not displayed`,
  `Triage rules`, `Regression coverage`, `Related documents`.
- **Diagrams** are Mermaid `flowchart TB`, with an `Abstract (shared)` subgraph linking the API type
  to [shared/architecture/](shared/architecture/). Small helpers are collapsed under one label.
- **Status words.** `implemented`, `planned`, `Open` (for open questions); coverage tags as defined
  in each coverage document.
- Test-fixture catalogues are not design: they live next to the fixtures, see
  [packages/samples/README.md](../../packages/samples/README.md).
- Agent-only material (traps, session lessons, review briefs) lives in `agent-packages/`.
- **API type order.** Lists of API types — this index, Storybook, the single-suite screenshot
  runner, Debug stories — go from the core to the overall specifications: JSO, JSON Schema,
  AsyncAPI, OpenAPI (both built on JSO and JSON Schema), DDL API, GraphQL (neither is). See
  [Storybook and runner order](#storybook-and-runner-order).

## Storybook and runner order

`packages/api-doc-viewer/.storybook/preview.ts` (`storySort.order`) is the source of truth: `Debug`
first (one entry per viewer, in API type order), then one block per API type — plain suites, diffs
suites, feature suites, compatibility suites — with explicit sub-orders where alphabetical order
would mislead (OpenAPI compatibility suites: version pairs, then suites operation top-down). The
single-suite runner (`pnpm run screenshot-test-single-suite` / `regenerate-screenshots-single-suite`,
`bin/run-screenshot-test-suite.mjs`) lists its test runs from
`packages/api-doc-viewer/bin/screenshot-test-run-order.json`; `tests/storybook-order.test.ts` checks
that file against `preview.ts` and that every hand-written IT test run is listed. Storybook parses
`storySort` statically, so `preview.ts` cannot import the order.

## Workflow

Features are built test-first:

1. **Design** — add or update the feature file and the coverage document.
2. **Tests first** (`api-doc-viewer-testing`) — fixtures under `packages/samples/`, their catalogue,
   Storybook stories, and screenshot ITs; data-layer unit tests in `packages/next-data-model/tests/`.
3. **Implement** (`next-data-model-authoring`, then `api-doc-viewer-authoring`) until the tests pass.
4. Repeat 2–3 until the developer confirms the feature is done; then refresh the diagrams and the
   coverage document, and let `api-doc-viewer-using` pick up integrator-visible changes.
