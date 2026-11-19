# Review brief — OpenAPI

Shared rules: [../SKILL.md](../SKILL.md).

## Scope

| Layer | Paths |
| --- | --- |
| Viewers | `packages/api-doc-viewer/src/components/OpenApiOperationViewer/` (`OpenApiOperationViewer`, `OpenApiOperationDiffsViewer`) |
| Viewer utilities | `packages/api-doc-viewer/src/utils/openapi/`, `shared-styles/colors/openapi.css` (`buildOpenApiDiffCause` in `utils/common/changes.ts` is a legacy GraphQL / annotation helper, not part of this stack) |
| Shared UI introduced for OpenAPI | `shared-components/Security/`, `Separator/`, `ExternalDocsRow/`, `Selector` tone, `TitleRowUsage.CollapsibleSection`, `OPENAPI_*` preceded-by kinds, `shared-styles/frame.css` |
| Data model | `packages/next-data-model/src/{model,building-service,shared}/openapi/` and the spec-neutral `{model,building-service}/security/` |

Out of scope: `stories/`, `it/`, `samples/`, `bin/`, and the nested JSON Schema and JSO viewers
(review them with their own briefs). The security module is shared with AsyncAPI: report its
findings here, but check every fix against the AsyncAPI security sections too.

## Design

- Index, decisions D1–D17, open questions: `docs/design/openapi/README.md`
- Coverage: `docs/design/openapi/display-coverage.md`
- Architecture: `docs/design/openapi/architecture/`
- Deviations from the design (I1–I12, V1–V11): `docs/design/openapi/notes/2026-10-implementation-decisions.md`
  — the 2026-10 review rewrote the diagrams and (batch 9, D2) the entity and feature pages to match the code.
- Security: `docs/design/openapi/features/security-redesign.md`, `docs/design/async-api/features/security.md`
- Shared features: `docs/design/shared/features/`

## Focus

- **Layout as a cross-API contract.** The separator layout is spec-neutral since the 2026-10
  review (F1): `model/abstract/layout/` (`LayoutPlanner`, `BlockEdges`, `LayoutSpacingConfig`),
  `model/security/block-edges.ts`, the viewer's `shared-components/Layout/StackLayout.tsx` and
  `LayoutSpacingContext` (provided by every root). Check that shared components and AsyncAPI import
  nothing from `model/openapi/layout/` or the OpenAPI viewer folder, and that no root renders a
  `StackLayout` without providing the context.
- **API-type names on shared pieces.** Shared rows use behaviour names since F2
  (`PrecededBy.SEPARATOR_LAYOUT_*`, `TitleRowUsage.CollapsibleSection`, `X_AXIS_PADDING_ROWS`). The
  other API-type-named `TitleRowUsage` members (`DdlApiSection`, `AsyncApiJsoSection`, …) are left
  for their own reviews; new shared members get behaviour names.
- **Large transformer classes.** `openapi-spec-with-diffs-transformer.ts` (~540 lines),
  `openapi-spec-transformer.ts` (~400), `object-schema-with-diffs-synthesizer.ts` (~310),
  `model/openapi/tree-with-diffs/row-diffs.ts`: check single responsibility; section presence (I3)
  lives inside the transformer.
- **Catch-all aggregation.** One `KindAny` aggregator per family driven by tables (I2): check
  it against the Strategy-by-kind rule and against `building-service/security/tree-with-diffs/`.
- **Two security builders.** `openapi-security-spec-builder.ts` / `-with-diffs-builder.ts` next to
  the spec-neutral `security-spec-builder.ts` / `security-spec-diffs-decorator.ts`: duplication,
  and the decorator vs subclass choice against D2.
- **Visibility as free functions.** `model/openapi/node-visibility.ts` and
  `model/security/node-visibility.ts` (I5) — verify they are one class per concern, not a set of
  functions, and that no visibility check remains in containers.
- **Diff work in the viewer.** `diff-state.ts`, `response-blocks.tsx`, `buildOpenApiDiffCause`,
  per-response media-type state (V8), and `SecuritySchemeCardBase` (~490 lines) frame positions
  (V6): anything derived from raw diffs belongs in `OpenApiRowDiffs` accessors.
- **One component set for plain and with diffs (D5).** Check that branching on `*WithDiffs` stays
  thin and does not repeat per container.
- **Design drift.** The 2026-10 review aligned the diagrams, entity pages and `features/diffs.md`
  with the code (D1, D2). Check every code name a page mentions still exists (classes, files,
  accessors, test files) and that the later approved feature designs (`vertical-gaps.md`, …) have not
  been contradicted by an older entity page. Report each disagreement.
- Previous review: `docs/design/openapi/notes/2026-10-architecture-review.md` — start from its open
  findings.
