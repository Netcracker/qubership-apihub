# Review brief — JSON Schema

Shared rules: [../SKILL.md](../SKILL.md).

## Scope

| Layer | Paths |
| --- | --- |
| Viewers | `packages/api-doc-viewer/src/components/JsonSchemaViewer/` (`JsonSchemaViewer`, `JsonSchemaDiffsViewer`) |
| Data model | `packages/next-data-model/src/{model,building-service,shared}/json-schema/` |
| Shared pieces used | `components/shared-components/` rows, `diffs/TagsWithDiffs`, `ShowUnchangedRow` |

Out of scope: `stories/`, `it/`, `samples/`.

## Design

- Coverage: `docs/design/json-schema/display-coverage.md`
- Architecture: `docs/design/json-schema/architecture/`
- Features: `docs/design/json-schema/features/` (validation rows, meta flags and `required`,
  nesting-indicator rows, hiding unchanged nodes, node key rename)
- Previous review: `docs/design/json-schema/notes/2026-09-architecture-review.md`

## Focus

- Plain and with-diffs components stay genuinely split; shared pieces are presentational only.
- Every row has its own severity placement.
- Row diff accessors (`JsonSchemaRowDiffs`) and resolvers are the only diff inputs of the viewer.
- Lazy materialization: no logic depends on children that are not built yet.
- The legacy api-data-model based `JsonSchemaViewer` is gone (the current next-data-model viewer, formerly `JsonSchemaNextViewer`, now owns that name); the GraphQL `DiffTags` / `DiffBadge` must not be reused.
