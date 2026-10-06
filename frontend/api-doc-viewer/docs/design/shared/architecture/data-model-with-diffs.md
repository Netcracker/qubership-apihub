# Data model — with diffs (abstract)

The API-type-agnostic diff layer of `next-data-model`. With-diffs builders read a merged `apiDiff`
document (diffs attached under `DiffMetaKeys`) and attach precomputed diff state to every node.

```mermaid
flowchart TB
  subgraph PLAIN["Plain stack (see data-model-plain.md)"]
    SpecBuilder["&lt;Spec&gt;TreeBuilder"]
    AbsBuilder["TreeBuilder"]
  end

  subgraph ABS_BS["building-service/abstract/tree-with-diffs"]
    AbsWithDiffs["builder.ts<br/>TreeWithDiffsBuilder<br/>(JSO only)"]
    MetaKeys["node-diffs-data/diff-meta-keys.ts<br/>DiffMetaKeys"]
    Aggregated["node-diffs-data/aggregated-diff-types.ts<br/>takeAggregatedDiffs · mergeAggregatedDiffTypesIntoDescendantSummary"]
    subgraph AGG["node-diffs-data — five aggregator families"]
      A1["AbstractNodeDiffsAggregator"]
      A2["AbstractNodeDiffsSummaryAggregator"]
      A3["AbstractNodeDescendantsDiffsAggregator"]
      A4["AbstractNodeDescendantsDiffsSummaryAggregator"]
      A5["AbstractNodeDiffsSeveritiesAggregator"]
    end
  end

  subgraph ABS_MODEL["model/abstract/tree-with-diffs"]
    TreeD["tree.impl.ts · TreeWithDiffs"]
    NodesD["{simple,complex}-node.impl.ts<br/>SimpleTreeNodeWithDiffs · ComplexTreeNodeWithDiffs"]
    Fields["tree-node.interface.ts<br/>diffs · descendantDiffs · diffsSummary ·<br/>descendantDiffsSummary · diffsSeverities<br/>ChangedPropertyMetaData · NodeDiffsSeverityPlacemennt"]
    ListSide["list-side-display.ts<br/>side entries for lists and chips"]
    Unchanged["changed-only/resolve-unchanged-blocks.ts"]
  end

  subgraph SPEC["API type"]
    SpecTransformerD["shared/&lt;spec&gt;-spec-with-diffs-transformer.ts"]
    SpecBuilderD["tree-with-diffs/builder.ts<br/>&lt;Spec&gt;TreeWithDiffsBuilder"]
    Factories["node-diffs-data/&lt;family&gt;/factory.ts<br/>&lt;Spec&gt;&lt;Family&gt;AggregatorFactory.instance(kind)"]
    Kinds["node-diffs-data/&lt;family&gt;/kind-*.ts<br/>&lt;Spec&gt;&lt;Family&gt;AggregatorKind*"]
    Accessors["model/&lt;spec&gt;/tree-with-diffs/<br/>&lt;Spec&gt;RowDiffs accessors"]
  end

  AbsBuilder -->|extends| SpecBuilder
  SpecBuilder -->|extends: default layout| SpecBuilderD
  AbsBuilder -->|extends| AbsWithDiffs
  AbsWithDiffs -.->|extends: JSO exception| SpecBuilderD
  SpecBuilderD --> SpecTransformerD
  SpecBuilderD --> MetaKeys
  SpecBuilderD --> Factories
  Factories --> Kinds
  Kinds -->|extend| AGG
  Kinds --> Aggregated
  SpecBuilderD --> TreeD
  TreeD --> NodesD
  NodesD --> Fields
  Accessors --> Fields
  Accessors --> ListSide
  Unchanged --> Fields
```

## Node diff fields

| Field | Meaning |
| --- | --- |
| `diffs[key]` | Diff of one value field; `diffs[""]` (`NODE_LEVEL_DIFF_KEY`) is the whole-node diff |
| `descendantDiffs[childKey]` | Diffs of direct children, keyed by child key |
| `diffsSummary` | Diff types of the node itself |
| `descendantDiffsSummary` | Diff types anywhere below the node |
| `diffsSeverities[placement]` | One severity per rendered row (`title-row`, `description-row`, …) |

Each diff is a `ChangedPropertyMetaData`: the `Diff` plus per-side `styles` (visibility, colors),
`flags` (level increase), and `highlightingMode` — everything a viewer needs to render it.

## Notes

- Default layout: `<Spec>TreeWithDiffsBuilder` extends `<Spec>TreeBuilder` and adds only diff
  methods and factory overrides. JSO is the exception and extends `TreeWithDiffsBuilder`.
- Each family is a Factory + Strategy: the factory returns a kind-specific aggregator; kind
  aggregators extend `KindAny` and call `super.aggregate()` first.
- Section headers follow [../features/section-header-colorizing.md](../features/section-header-colorizing.md).
