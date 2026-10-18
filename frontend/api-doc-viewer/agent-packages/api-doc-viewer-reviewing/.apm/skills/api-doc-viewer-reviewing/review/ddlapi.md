# Review brief — DDL API

Shared rules: [../SKILL.md](../SKILL.md).

## Scope

| Layer | Paths |
| --- | --- |
| Viewers | `packages/api-doc-viewer/src/components/DdlTableViewer/` (`DdlTableViewer`, `DdlTableDiffsViewer`) |
| Viewer utilities | `packages/api-doc-viewer/src/utils/ddlapi/` |
| Data model | `packages/next-data-model/src/{model,building-service,shared}/ddlapi/` |

Out of scope: `stories/`, `it/`, `samples/`, and the external `qubership-apihub-ddlapi` package.

## Design

- Coverage: `docs/design/ddlapi/display-coverage.md`
- Product design: `docs/design/ddlapi/features/doc-view.md`, `docs/design/ddlapi/entities/`
- Architecture: `docs/design/ddlapi/architecture/`

## Focus

- **Transformer size and responsibility.** `DdlApiSpecTransformer` and
  `DdlApiSpecWithDiffsTransformer` do all ddlapi interpretation; check single responsibility and
  duplication between them.
- **Shared severity placement.** Column `Values`, `Default`, and `As` rows share
  `NodeDiffsSeverityPlacemennt.AdditionalInfoRow`; JSON Schema uses one placement per row.
- **Free-function helpers in `utils/ddlapi/`** (`column-row-badges.ts`, `node-level-diff.ts`) versus
  class-based accessors (`DdlApiRowDiffs`).
- **Plain / with-diffs split** of `ColumnsNodeViewer` and `IndexesNodeViewer`: both variants and
  the dispatcher live in one file each, unlike the `*WithDiffs` files used for table, column, and
  index nodes.
- **Badge ordering and suppression rules** (`not null` hidden by `PK`, FK last) live in
  `ColumnRowBadgesContent`; decide whether they belong in the data model.
- Stable-flag and `textHighlighterColor` rules stay in aggregators (see the coverage doc).
