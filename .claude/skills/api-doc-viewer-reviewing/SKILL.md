---
name: api-doc-viewer-reviewing
description: Architecture review and refactoring of one api-doc-viewer API type stack (JSON Schema, AsyncAPI, DDL API, JSO) — shared rules, report format, and per-API-type briefs.
---

# Reviewing an API type stack

Use for an architecture review or refactoring pass over one API type: its data model in
`packages/next-data-model/` and its viewers in `packages/api-doc-viewer/`. The shared rules below
apply to every API type; scope and specifics live in the brief for that type:

| API type | Brief |
| --- | --- |
| JSON Schema | [review/json-schema.md](review/json-schema.md) |
| AsyncAPI | [review/async-api.md](review/async-api.md) |
| DDL API | [review/ddlapi.md](review/ddlapi.md) |
| JSO | [review/jso.md](review/jso.md) |

GraphQL is legacy and is not reviewed.

## Sources of truth

1. Design: `docs/design/<api-type>/` (display coverage, architecture diagrams, features) and
   `docs/design/shared/`.
2. Authoring skills (`next-data-model-authoring`, `api-doc-viewer-authoring`,
   `api-doc-viewer-testing`) derive from the design. Report every place where a skill or the code
   disagrees with the design.

## Rules

### Never

- Type assertions (`value as T`), unless the value is certainly of that type and TypeScript cannot
  infer it for a structural reason. Every remaining assertion needs that justification.
- Free functions or sets of functions that encapsulate domain logic only by convention. Domain
  logic is encapsulated with OOP (classes, static methods on one class per concern). Exception:
  hooks for third-party integration (`json-crawl` transformers, `api-diff`, `api-unifier`).
- Literal string constants used inline, especially duplicated ones — declare constants.
- Components declared inside another component's body.
- Literal or logical duplication of algorithms, helpers, or approaches.
- Inline types — declare type aliases, interfaces, or classes.
- Diff calculation or aggregation in components or viewer helpers. It belongs in next-data-model.
- React state abuse in the style of the legacy `api-state-model`.

### Always

- next-data-model follows SOLID and OOP, except at third-party integration points.
- Every value reference is type-safe; no `any`, no `unknown` without narrowing, no error
  suppression.

### Approaches

- **Fewer types and functions, each general or single-responsible.** Use type parameters to
  generalize domains, kinds, and entities; never merge unrelated responsibilities.
- **Container / presentational components.** Containers are API-type specific; presentational
  components are universal. Watch for API-type logic leaking into shared rows such as `TitleRow`
  and `TextRow`.
- **Strategy and Abstract Factory by `type` and `kind`.** Split generic logic from kind-specific
  logic; avoid catch-all handlers.
- **Clean, reusable CSS.** Styles shared by two or more API types (JSO, JSON Schema, AsyncAPI,
  DDL API) are generalized; specific styles stay local. Prefer BEM naming. Never look at GraphQL
  for CSS patterns.
- **Minimal blind spots.** Keep agent docs consistent with the approved implementation: compact,
  complete, and free of accidental or contradictory behaviour.

## Constraints

- Never analyze or change samples, stories, or screenshot tests.
- Never change npm scripts, TypeScript, Vite, ESLint, or other configs — list proposals in a
  separate report section for approval.
- Never run npm scripts except the static Storybook server. Type-check and test by invoking
  `node_modules/.bin/tsc --noEmit` and `node_modules/.bin/jest` directly.
- Do not treat other API types as best practice; they may be cited as better solutions.

## Report

1. Write the report to `docs/design/<api-type>/notes/<yyyy-mm>-architecture-review.md` — it is too
   large for chat.
2. Findings table columns: `ID`, `Status`, `Severity`, `Where`, `What`, `Broken rule(s)`,
   `Suggested fix`. Link long explanations to report sections.
3. Update the architecture diagrams in `docs/design/<api-type>/architecture/` when the structure
   changes; the report itself holds findings, decisions, lessons, and verification only.
4. Apply approved fixes one at a time; after each, type-check and run both packages' Jest suites.
