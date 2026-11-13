# OpenAPI — data model, with diffs

Status: **implemented**; diagram refreshed to the code on 2026-10-29
([../notes/2026-10-architecture-review.md](../notes/2026-10-architecture-review.md), D1). Decisions
behind this shape: I2, I3, I6–I8 in [../notes/2026-10-implementation-decisions.md](../notes/2026-10-implementation-decisions.md).
Paths are relative to `packages/next-data-model/src/`. Abstract layer:
[../../shared/architecture/data-model-with-diffs.md](../../shared/architecture/data-model-with-diffs.md).
Rules: [../features/diffs.md](../features/diffs.md).

```mermaid
flowchart TB
  subgraph ABS["Abstract (shared)"]
    RecordDriven["building-service/abstract/tree-with-diffs/node-diffs-data/<br/>record-driven-aggregators.ts · RecordDriven*Aggregator (5 families)<br/>RecordDrivenAggregatorRegistry (built from RecordDrivenAggregationTables, cached per kind)"]
    SideReader["building-service/shared/side-reader.ts<br/>SideReader (readField · normalizeFlagDiff · replaceRecordEntry) ·<br/>SideContext · SideContexts (NONE · BOTH · intersect · union) · FieldSides"]
    Rollup["api-diff aggregateDiffsWithRollup · aggregatedDiffsMetaKey"]
    RowDiffsBase["model/abstract/tree-with-diffs/row-diffs-base.ts<br/>NodeLevelRowDiffs (isFlagOnSide · takeChangesMarkerSummary) · SectionRowDiffs"]
    DiffTypeOrder["model/abstract/tree-with-diffs/diff-type-order.ts<br/>DiffTypeOrder (compare · strongest* · toSeverity) — the one diff-type order"]
    Placements["NodeDiffsSeverityPlacemennt<br/>+ OperationIdRow(WithDeprecatedTag) · AddressRow(WithDeprecatedTag) ·<br/>ExternalDocsRow · SelectorRow · SecurityScheme*Row · OAuthFlow*Row"]
  end

  subgraph SEC["Security module (spec-neutral, shared with AsyncAPI)"]
    SecDecorator["building-service/security/security-spec-diffs-decorator.ts<br/>SecuritySpecDiffsDecorator (composed)"]
    SecTables["model/security/tree-with-diffs/placements.ts<br/>SECURITY_FIELD_PLACEMENTS · SECURITY_NODE_PLACEMENTS<br/>+ building-service/security/tree-with-diffs/aggregation-tables.ts<br/>SECURITY_SYNTHETIC_FIELD_DIFF_KEYS · SECURITY_AGGREGATION_TABLES (AsyncAPI)"]
    SecRowDiffs["model/security/tree-with-diffs/row-diffs.ts · SecurityRowDiffs<br/>(scope rows with severity · Alternatives: toolbar row diff, isToolbarShownOnSide)"]
    SecCardRows["model/security/card-rows.ts · SecuritySchemeCardRows<br/>card label / value rows from the placement table"]
  end

  subgraph PLAIN["Plain stack (data-model-plain.md)"]
    Builder["OpenApiTreeBuilder"]
    Transformer["OpenApiSpecTransformer"]
    SecBuilder["OpenApiSecuritySpecBuilder"]
    Synth["OpenApiObjectSchemaSynthesizer"]
    NodeData["OpenApiNodeDataBuilder (reused as is)"]
  end

  subgraph BSD["building-service/openapi"]
    TransformerD["shared/openapi-spec-with-diffs-transformer.ts<br/>OpenApiSpecWithDiffsTransformer<br/>record relocation · response-code options diffs · extensions · rollup<br/>(no per-operation state)"]
    Facts["shared/openapi-diffs-operation-facts.ts<br/>OpenApiDiffsOperationFactsResolver<br/>sides · whole diff · address diff · responses / parameters / requestBody fields<br/>(per context, cached)"]
    Presence["shared/openapi-section-presence.ts<br/>OpenApiSectionPresence<br/>presence per section · writeSectionDiff (I3)"]
    ContentD["shared/openapi-content-with-diffs-decorator.ts<br/>OpenApiContentWithDiffsDecorator<br/>media-type options · cloned extension diffs"]
    SecBuilderD["shared/openapi-security-spec-with-diffs-builder.ts<br/>OpenApiSecuritySpecWithDiffsBuilder (one list / switched lists, allowsAnonymous)"]
    SynthD["shared/object-schema-with-diffs-synthesizer.ts<br/>OpenApiObjectSchemaWithDiffsSynthesizer"]
    BuilderD["tree-with-diffs/builder.ts<br/>OpenApiTreeWithDiffsBuilder · assignNodeDiffs"]
    Tables["tree-with-diffs/aggregation-tables.ts<br/>OPENAPI_AGGREGATION_TABLES (value props + synthetic keys,<br/>the placement tables); one record-driven family for every kind (I2)"]
  end

  subgraph MODELD["model/openapi/tree-with-diffs"]
    TreeD["tree.impl.ts · OpenApiTreeWithDiffs"]
    DiffKeys["diff-keys.ts · OPENAPI_MEDIA_TYPE_OPTIONS_DIFF_KEY · OPENAPI_RESPONSE_OPTIONS_DIFF_KEY"]
    RowDiffs["row-diffs.ts · OpenApiRowDiffs<br/>Operation · RequestBody · ResponseBody · MediaType · Responses · Response"]
    OpenApiPlacements["placements.ts · OPENAPI_FIELD_PLACEMENTS · OPENAPI_NODE_PLACEMENTS<br/>(the Security tables spread in)"]
  end

  Builder -->|extends| BuilderD
  Transformer -->|extends| TransformerD
  SecBuilder -->|extends| SecBuilderD
  Synth -->|extends| SynthD
  BuilderD --> NodeData
  BuilderD --> TransformerD
  TransformerD --> SideReader
  TransformerD --> SynthD
  TransformerD --> Facts
  TransformerD --> Presence
  TransformerD --> ContentD
  TransformerD -->|createSecuritySpecBuilder| SecBuilderD
  SecBuilderD -->|host| Facts
  SecBuilderD -->|host| Presence
  SecBuilderD --> SecDecorator
  TransformerD --> Rollup
  TransformerD --> DiffKeys
  BuilderD -->|OPENAPI_AGGREGATORS: RecordDrivenAggregatorRegistry| RecordDriven
  BuilderD --> Tables
  Tables --> OpenApiPlacements
  OpenApiPlacements --> SecTables
  OpenApiPlacements --> Placements
  BuilderD --> TreeD
  RowDiffs --> RowDiffsBase
  RowDiffs --> DiffKeys
  SecRowDiffs --> RowDiffsBase
  SecRowDiffs --> DiffTypeOrder
  SecCardRows --> SecTables
  RecordDriven --> DiffTypeOrder
```

## Builder contract

`OpenApiTreeWithDiffsBuilder` overrides only:

| Member | Rule |
| --- | --- |
| `public declare readonly tree: OpenApiTreeWithDiffs` | retype only |
| `createTree()`, `createNodeDataBuilder()`, `prepareSource()`, `logPrefix` (`[OpenAPI][WithDiffs]`) | overrides |
| `takeCrawlValue()` | keeps arrays (`isObjective`) — list records (alternatives) live on the arrays |
| `createNodeFromRaw()` | `super.createNodeFromRaw(...)`, narrow with `isOpenApiTreeNodeWithDiffs`, then `assignNodeDiffs` |
| `assignNodeDiffs()` | node diffs → summary → descendant diffs → descendant summary (from the rollup; `mergeAggregatedDiffTypesIntoDescendantSummary` is **not** called, I6) → severities |

No type assertions between plain and with-diffs node types; guards only.

## Notes

- The transformer writes every diff where its row reads it (child-section, option, scheme, and
  synthetic whole-section records); the aggregators only map records to rows through the kind
  tables — no per-kind aggregator classes (I2).
- Section presence per side is recorded while the transformer builds each section
  (`OpenApiSectionPresence`: a `WeakMap` from each built section to its presence, `writeSectionDiff`),
  not by a separate pass over the spec (I3).
- The transformer keeps no per-operation state: each step reads the facts of the context it is
  given from `OpenApiDiffsOperationFactsResolver` (2026-10 review, F7). The security builder gets
  the resolver and the presence object as its host — objects, not callbacks.
- Parameters, response headers, media-type schemas, and extensions are separate trees in the
  viewer; the forward descendant summary reads `aggregatedDiffsMetaKey`, so changes inside those
  trees still mark selector options and section headers.
- Section headers follow
  [../../shared/features/section-header-colorizing.md](../../shared/features/section-header-colorizing.md)
  evaluated over section presence per side, [../features/diffs.md](../features/diffs.md#section-presence-and-whole-section-changes).
- Row visibility has no with-diffs variant: `OpenApiNodeVisibility` works on merged values (I5).
