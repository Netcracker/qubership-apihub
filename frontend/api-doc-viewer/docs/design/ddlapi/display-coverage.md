# DDL API — display coverage

Baseline for the DDL stack (`DdlTableViewer` / `DdlTableDiffsViewer` + `DdlApiTreeBuilder` /
`DdlApiTreeWithDiffsBuilder`). Assumes **current behaviour is correct**: this document records
what is shown today, what is omitted on purpose, and how to classify a gap before planning work
or writing tests.

Last reviewed against the codebase: 2026-09-25.

## Sources

Keep in sync when behaviour changes.

| Layer | Location |
| --- | --- |
| ddlapi schema model | `qubership-apihub-ddlapi/src/schema.ts`, `attrs.ts`, `types.ts`, `exprs.ts`, `postgres.constants.ts` |
| Realm → view-model | `packages/next-data-model/src/building-service/ddlapi/shared/ddlapi-spec-transformer.ts` |
| Merged diffs → view-model | `packages/next-data-model/src/building-service/ddlapi/shared/ddlapi-spec-with-diffs-transformer.ts` |
| View-model types | `packages/next-data-model/src/model/ddlapi/tree/node-value.ts` |
| Row visibility | `packages/next-data-model/src/building-service/ddlapi/{tree,tree-with-diffs}/node-visibility-data/` |
| Row diffs accessors | `packages/next-data-model/src/model/ddlapi/tree-with-diffs/property-row-diffs.ts` (`DdlApiRowDiffs`) |
| Expr formatting | `packages/next-data-model/src/shared/ddlapi/format-ddl-expr.ts` |
| Viewers | `packages/api-doc-viewer/src/components/DdlTableViewer/` |
| Fixture catalogues | `packages/samples/ddlapi/README.md`, `packages/samples/ddlapi-diffs/README.md` |

## Scope

One **table** selected by `TableKey` (`schemaName` + `name`) from a ddlapi `Realm` (plain) or a
merged diff document (with diffs). Not a schema browser, ER diagram, or full DDL document viewer.
Product design: [features/doc-view.md](features/doc-view.md) and [entities/](entities/).

| Viewer | Props |
| --- | --- |
| `DdlTableViewer` | `source`, `tableKey`, `navigationLinkBuilder`, `navigationLinkComponent`, `displayMode`, `devMode`, `noHeading` |
| `DdlTableDiffsViewer` | `mergedSource` instead of `source`, plus `diffMetaKeys`, `diffTypes` |

## Pipeline

```text
Realm | merged diff document
  → DdlApiSpecTransformer | DdlApiSpecWithDiffsTransformer
  → DdlApiTreeBuilder | DdlApiTreeWithDiffsBuilder
  → DdlTableViewer | DdlTableDiffsViewer
  → TableNodeViewer[WithDiffs] → ColumnsNodeViewer / IndexesNodeViewer → Column / Index node viewers
```

Diagrams: [architecture/](architecture/).

## Classification tags

| Tag | Meaning |
| --- | --- |
| **`viewer`** | Shown today. |
| **`ndm-reserved`** | Mapped into `DdlApi*RowValue` / `DdlApiColumnTypeValue` but **not** painted; keep for consumers, tests, or future UI. |
| **`ndm-future`** | Valid ddlapi data for the table scope that the transformer **does not map yet**. |
| **`out-of-scope`** | Outside the single-table product scope — absence is **not** a regression. |
| **`parser-gap`** | ddlapi model type exists but `buildFromDdl` does not emit it (or skips the statement). |

## Displayed (plain)

Rows marked *detailed* are shown only in `DETAILED_DISPLAY_MODE`.

### Table header (`TableNodeViewer`, `DdlSchemaNameBlock`)

| UI element | Condition | ddlapi source | View-model field |
| --- | --- | --- | --- |
| Table name (h1) | always, unless `noHeading` | `Table.name` | `tableName` |
| Schema name row | `schemaName !== 'public'` | parent `Schema.name` | `schemaName` |
| Table description | *detailed*, comment present | `findAttr(table.attrs, Comment).text` | `description` |

### Columns section (`ColumnsNodeViewer` → `ColumnNodeViewer`)

| UI element | Condition | ddlapi source | View-model field |
| --- | --- | --- | --- |
| Section title `Columns` | ≥1 column | static | `title` |
| Column name | always | `Column.name` | `columnName` |
| Type label | always | `Column.type` → formatted `SchemaType` / `raw` | `columnType.label` |
| **PK** badge | column ∈ primary key | `Table.primaryKey.parts[*].column` | `isPrimaryKey` |
| **unique** badge | single-column unique index | `unique && parts.length === 1` | `isUnique` |
| **not null** badge | explicit `NOT NULL`, **hidden when PK is shown** | `ColumnType.null === false` | `isNotNull` |
| **generated** badge | IDENTITY or `GENERATED AS` | `PgAttrKind.Identity` / `AttrKind.GeneratedExpr` | `isGenerated` |
| **FK** badge + link, one per target | column ∈ FK with resolved target | `ForeignKey.columns` + `refTable` + `refColumns[i]` | `foreignKeyTargets[]` |
| Column description | *detailed*, comment present | `findAttr(column.attrs, Comment).text` | `description` |
| **Values** row | *detailed*, enum column | `EnumType.values` | `enumValues` |
| **Default** row | *detailed*, `Column.default` present | `formatDdlExpr(Column.default)` | `defaultValue` |
| **As** row | *detailed*, expression-generated column | `GeneratedExpr.expr` (not IDENTITY) | `generatedExpression` |

Display rules:

- Badge order: **PK**, **unique**, **not null**, **generated**, then **FK** badges last (the link
  text after **FK** would break the badge group otherwise).
- FK link text: `table.column` for targets in `public`, `schema.table.column` otherwise.
- `generatedBy` (`identity` | `expression`) is stored but the badge text is always **generated**.
- Explicit `NULL` and absent nullability show no badge.
- Composite unique indexes do **not** set `isUnique` on individual columns.
- `Table.primaryKey` is never an index row; it appears only as the **PK** badge.

### Indexes section (`IndexesNodeViewer` → `IndexNodeViewer`)

| UI element | Condition | ddlapi source | View-model field |
| --- | --- | --- | --- |
| Section title `Indexes` | ≥1 entry in `Table.indexes` | static | `title` |
| Index title | always | `Index.name`, or `<unnamed>` | `indexName` |
| Part list `(c1, c2)` | ≥1 part | `IndexPart` → column name or `formatDdlExpr(expr)`, ordered by `seqNo` | `partNames` |
| **unique** badge | unique index | `Index.unique === true` | `isUnique` |
| Index description | *detailed*, comment present | `findAttr(index.attrs, Comment).text` | `description` |

### Column type label

The viewer prints `columnType.label` only. Parameters are folded into the label with a space
before the parenthesis (`normalizeTypeLabelSpacing`).

| `SchemaType.kind` | Label inputs | Example |
| --- | --- | --- |
| `BoolType` | `type` | `boolean` |
| `IntegerType` | `type` | `integer`, `bigint`, `serial` |
| `DecimalType` | `type`, `precision`, `scale` | `numeric (10, 2)` |
| `FloatType` | `type`, `precision` | `double precision` |
| `StringType` | `type`, `size` | `character varying (30)` |
| `BinaryType` | `type`, `size` | `bytea` |
| `TimeType` | `type`, `precision`, `scale` | `timestamp (6)` |
| `JSONType` / `SpatialType` / `UUIDType` | `type` | `jsonb`, `point`, `uuid` |
| `EnumType` | named `type`, else first of `values[]`, else `enum` | `order_status` |
| `UnsupportedType` | raw dialect `type` | `interval`, `bit (8)` |
| `PgTypeKind.Domain` | domain name | `email_address` |
| other escape hatch | `type` or `kind` | driver-specific |
| (fallback) | `ColumnType.raw`, else `unknown` | raw SQL fragment |

### Expr kinds in displayed strings

| `Expr.kind` | Where shown | Formatting |
| --- | --- | --- |
| `Literal` | default, index expression parts | `value` |
| `RawExpr` | default, index expression parts | `expr` |
| `NamedDefault` | default (unwrapped) | underlying literal/raw |
| `UnknownExpr` | default, index parts | best effort |

## Displayed (with diffs)

`DdlTableDiffsViewer` renders the same rows side by side. Every diff is prepared by the transformer
and kind aggregators; viewers read it through `DdlApiRowDiffs` (including `DdlApiRowDiffs.ForeignKey.resolveTargetSideDisplay`),
`takeColumnFlagDiffs`, `takeColumnForeignKeyTargetDiffs`, and `takeIndexFlagDiffs`.

| Area | What is diffed |
| --- | --- |
| Table | whole table add/remove, schema name, description |
| Sections | `Columns` / `Indexes` title row when every child was added or removed |
| Column title row | whole column add/remove, type label, each badge flag, each FK target |
| Column rows | description, **Values** (per value and whole row), **Default**, **As** |
| Index title row | whole index add/remove, part names, **unique** flag |
| Index rows | description |

Non-obvious rules (kept in the data layer):

- FK target replacement and generated kind switches keep the boolean flag unchanged; only the
  target or `generatedExpression` diff is emitted.
- `textHighlighterColor` applies to expression replace and FK link text only — never to
  column/index names. A synthetic title-row replace colors the row background only.
- Index part names are always rendered as `(c1, c2)` in diffs, including when `partNameDiffs` is absent.
- Names are never diffed: api-diff matches tables and columns by name, and indexes by name or by
  the columns an unnamed index covers, so a rename is a remove plus an add. DDL title-row diffs
  carry `DIFF_HIGHLIGHTING_MODES_DDL_TITLE_ROW` (immutable default area), so a replace diff only
  colors the row and never replaces the column/index name with a diff value.
- A foreign key that keeps its key while its referenced column or table changes is one **replace**
  target diff keyed by the after target (before target in `beforeValue`): the FK badge stays plain
  and each side shows its own target text in yellow
  (`DdlApiRowDiffs.ForeignKey.resolveTargetSideDisplay`). A column the key stops/starts covering
  is still a remove/add.
- `foreignKeyTargetDiffs` keys come from `formatForeignKeyTargetKeys`: a repeated target on the
  same column (e.g. a renamed key — the removed and the added key) gets an occurrence suffix, so
  each FK badge reads the diff of its own key.
- A column joining or leaving an existing primary key (`primaryKey.parts` add/remove) gets an
  `isPrimaryKey` flag diff.
- Known gap: the column `Values`, `Default`, and `As` rows share the single
  `NodeDiffsSeverityPlacemennt.AdditionalInfoRow` badge placement, so when several of them change
  their badges show the highest-severity diff. JSON Schema uses one placement per row.

## Not displayed

### A. Mapped, not rendered (`ndm-reserved`)

| Field | Why kept |
| --- | --- |
| `DdlApiColumnRowValue.generatedBy` | Distinguishes identity vs. expression; badge is always **generated**. |
| `DdlApiColumnTypeValue.kind`, `typeName` | Typing and tests; viewer uses `label`. |
| `DdlApiColumnTypeValue.unsigned` | Not appended to the label (MySQL / MariaDB only). |
| `DdlApiColumnTypeValue.precision`, `scale`, `size` | Folded into `label`. |
| `DdlApiColumnTypeValue.values` | Same list as `enumValues`; the viewer reads `enumValues`. |
| `DdlApiColumnTypeValue.baseTypeLabel`, `schemaName` (domain) | Domain base type resolved but not shown. |
| `DdlApiColumnTypeValue.raw` | Exposed on the type object; viewer shows `label`. |

Do not add viewer UI for these without product approval; do not delete them without checking
tests and external consumers.

### B. Table data not mapped by the transformer (`ndm-future`)

| ddlapi field / object | Notes | Tag |
| --- | --- | --- |
| `Table.attrs` except `Comment` | `Charset`, `Collation`, `Check`, `Partition`, `Inherits`, `StorageParams`, `Trigger` | `ndm-future` |
| `Table.objects` | e.g. `PgObjectKind.ExcludeConstraint` | `ndm-future` |
| `Table.deps`, `Table.kind` | dependency graph, discriminant | `out-of-scope` |
| `Column.attrs` except `Comment`, `GeneratedExpr`, `Identity` | `Charset`, `Collation`, `Check` | `ndm-future` |
| `ColumnType.null === true` | explicit nullable (no badge by design) | `ndm-future` |
| `GeneratedExpr.type` | `STORED` / `VIRTUAL` | `ndm-future` |
| `PgAttrKind.Identity` details | `generation`, `seqStart`, `seqIncrement` | `ndm-future` |
| Composite uniqueness on columns | only single-column `isUnique` | `ndm-future` |
| `ForeignKey.symbol`, `onUpdate`, `onDelete`, `attrs` | constraint details | `ndm-future` |
| Multi-column FK as one UI element | each column shows its own FK link | `out-of-scope` |
| `IndexPart.desc`, `IndexPart.attrs` | `DESC`, `IndexColumnProp`, `IndexOpClass` | `ndm-future` |
| `Index.attrs` except `Comment` | `IndexInclude`, `IndexNullsDistinct`, `IndexType`, `IndexPredicate`, `Concurrently`, `StorageParams` | `ndm-future` |
| `EnumType.attrs`, type-level attrs | enum / integer / string / time attrs | `ndm-future` |
| Domain `null`, `default`, `checks` | domain definition | `ndm-future` |

### C. Realm and schema scope (`out-of-scope`)

`Realm.ddlapi`, `Realm.attrs`, `Realm.objects`, `Schema.attrs`, `Schema.objects`, the
`Schema.tables` list (table picking is external), other tables (reachable only through FK links),
`View` (not supported by the parser), standalone `Check` / `NamedDefault` / `UnknownObject`.

### D. PostgreSQL escape-hatch kinds

Only `PgAttrKind.Identity` and the core `AttrKind.GeneratedExpr` are mapped. `Partition`,
`Inherits`, `StorageParams`, `Trigger`, `IndexInclude`, `IndexNullsDistinct`, `IndexType`,
`IndexPredicate`, `Concurrently`, `IndexColumnProp`, `IndexOpClass`, and `ExcludeConstraint` are
`ndm-future`. `CompositeType`, `RangeType`, and `Domain` as schema objects are `out-of-scope`
(a domain column shows the domain name in its label).

### E. Parser gaps (`parser-gap`)

`View`, `ALTER`, `DROP`, DML, `CREATE VIEW`, sequences, extensions, `CREATE TABLE … PARTITION OF …`,
and unresolved FK targets in a partial realm (the FK badge is omitted).

## Triage rules

1. Assert rendered text and badges against **Displayed**; do not expect **Not displayed** items
   unless a ticket expands scope.
2. New mappings start in `ddlapi-spec-transformer.ts` with a unit test in
   `packages/next-data-model/tests/unit-tests/ddlapi-spec-transformer.test.ts`, then move from
   `ndm-future` → product decision → viewer.
3. When ddlapi starts emitting a new attr, the default expectation is **no viewer change**.
4. Not bugs: no index row for the primary key; no **nullable** badge; `public` schema name hidden;
   composite unique not on columns; FK actions and constraint names hidden; partial-index /
   INCLUDE / opclass hidden.

## Regression coverage

| Suite | Stories | Fixtures |
| --- | ---: | --- |
| `DDL API Suite` (column types, constraints, indexes, descriptions, display modes, escaping, e2e) | 101 | `packages/samples/ddlapi/` |
| `DDL API Diffs Suite` (9 categories) | 288 | `packages/samples/ddlapi-diffs/` |

## Related documents

- Product design: [features/doc-view.md](features/doc-view.md), [entities/](entities/)
- Architecture diagrams: [architecture/](architecture/)
- ddlapi model reference: `ddlapi-using` skill
