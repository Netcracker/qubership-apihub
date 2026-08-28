# ddlapi → DdlTableViewer display coverage

Baseline reference for AI agents working on **api-doc-viewer** and **next-data-model**.
Assumes the **current behaviour is correct** — this document records what is shown today,
what is omitted on purpose, and how to classify gaps when planning work or writing tests.

**Primary sources (keep in sync when behaviour changes):**

| Layer | Location |
| --- | --- |
| ddlapi schema model | `qubership-apihub-ddlapi/src/schema.ts`, `attrs.ts`, `types.ts`, `exprs.ts`, `postgres.constants.ts` |
| Realm → view-model | `packages/next-data-model/src/building-service/ddlapi/shared/ddlapi-spec-transformer.ts` |
| View-model types | `packages/next-data-model/src/model/ddlapi/tree/node-value.ts` |
| Expr formatting | `packages/next-data-model/src/shared/ddlapi/format-ddl-expr.ts` |
| Viewer | `packages/api-doc-viewer/src/components/DdlTableViewer/` |

**Viewer scope:** one **table** selected by `TableKey` (`schemaName` + `name`) from a ddlapi
`Realm`. Not a schema browser, ER diagram, or full DDL document viewer.

**Pipeline:**

```text
Realm / merged diff document
  → DdlApiSpecTransformer (next-data-model)
  → DdlApiTableOrientedSpec + tree (DdlApiTreeBuilder)
  → DdlTableViewer / DdlTableDiffsViewer → TableNodeViewer → Columns / Indexes sections
```

`DdlTableDiffsViewer` renders column and index title-row diffs (badges, type, names) via
next-data-model aggregators and `*WithDiffs` node viewers. Additional-info rows, table-level
chrome, and some field diffs may still be **`ndm-future`** — see section G below.

---

## Agent classification legend

Use these tags in the **Not displayed** tables when triaging tickets or tests.

| Tag | Meaning |
| --- | --- |
| **`viewer`** | Shown in `DdlTableViewer` today (see § Displayed). |
| **`ndm-reserved`** | Mapped into `DdlApi*RowValue` / `DdlApiColumnTypeValue` but **not** painted by the viewer; keep for API consumers, tests, or future UI. |
| **`ndm-future`** | Valid ddlapi data for the current table scope that the transformer **does not map yet**; add here before viewer work if product asks for it. |
| **`out-of-scope`** | Outside single-table viewer product scope — do **not** treat absence as a regression. |
| **`parser-gap`** | ddlapi model type exists but `buildFromDdl` does not emit it (or statement is skipped). |

---

## § Displayed in DdlTableViewer

### Table header (`TableNodeViewer`, `DdlSchemaNameBlock`)

| UI element | Condition | ddlapi source | View-model field |
| --- | --- | --- | --- |
| Table name (H1) | always | `Table.name` | `DdlApiTableRowValue.tableName` |
| Schema name row | `schemaName !== 'public'` | parent `Schema.name` via `TableKey` | `DdlApiTableRowValue.schemaName` |
| Table description | `displayMode === detailed` and comment present | `findAttr(table.attrs, Comment).text` | `description` |

### Columns section (`ColumnsNodeViewer` → `ColumnNodeViewer`)

| UI element | Condition | ddlapi source | View-model field |
| --- | --- | --- | --- |
| Section title `"Columns"` | ≥1 column | static | `DdlApiSectionHeaderRowValue.title` |
| Column name | always | `Column.name` | `columnName` |
| Type label (text) | always | `Column.type` → formatted `SchemaType` / `raw` | `columnType.label` |
| **PK** badge | column ∈ primary key | `Table.primaryKey.parts[*].column === column` | `isPrimaryKey` |
| **unique** badge | single-column unique index | `Table.indexes`: `unique && parts.length === 1 && parts[0].column === column` | `isUnique` |
| **not null** badge | explicit `NOT NULL` | `ColumnType.null === false` | `isNotNull` |
| **generated** badge | IDENTITY or `GENERATED AS` | `PgAttrKind.Identity` or `AttrKind.GeneratedExpr` on `column.attrs` | `isGenerated` |
| **FK** badge + link | column ∈ FK and target resolved | `ForeignKey.columns` + `refTable` + `refColumns[i]` | `isForeignKey`, `foreignKeyTarget` |
| FK link text | same | resolved schema/table/column names | `formatForeignKeyTarget` → `schema.table.column` |
| Column description | detailed mode + comment | `findAttr(column.attrs, Comment).text` | `description` |
| **Default** row | `Column.default` present | `Column.default` → `formatDdlExpr` | `defaultValue` on `AdditionalInfoRow` |
| **As** row | expression-generated column | `findAttr(column.attrs, GeneratedExpr).expr` (not IDENTITY) | `generatedExpression` on `AdditionalInfoRow` |

**Notes (display rules):**

- `Table.primaryKey` is **never** a row in the Indexes section; PK appears only as the **PK**
  badge on column rows.
- `generatedBy` (`'identity' \| 'expression'`) is stored on the view-model but the badge text is
  always **generated** (identity vs expression is collapsed in the viewer).
- Explicit `NULL` (`ColumnType.null === true`) and absent nullability (`undefined`) do **not**
  show a badge.
- Composite unique indexes do **not** set `isUnique` on individual columns.

### Indexes section (`IndexesNodeViewer`)

| UI element | Condition | ddlapi source | View-model field |
| --- | --- | --- | --- |
| Section title `"Indexes"` | ≥1 entry in `table.indexes` | static | section `title` |
| Index title | named index | `Index.name` | `indexName` → title |
| Index title (unnamed) | no `Index.name` | ordered `IndexPart` list | `partNames.join(', ')` |
| Part list in subheader | named index | `Index.parts` → column name or `formatDdlExpr(expr)` | `partNames` in `(…)` |
| **unique** badge | unique index | `Index.unique === true` | `isUnique` |
| Index description | detailed mode + comment | `findAttr(index.attrs, Comment).text` | `description` |

**Notes:**

- Only `Table.indexes` are listed — not `Table.primaryKey`, not schema-level indexes.
- `IndexPart.seqNo` is used for sort order only (not shown).
- Expression index parts (`IndexPart.expr`) are formatted via `formatDdlExpr`.

### Column type label — ddlapi `SchemaType` coverage

The viewer prints **`columnType.label` only** (not separate fields). The transformer builds
the label from each `SchemaType` kind:

| `SchemaType.kind` | Label inputs from ddlapi | Example label |
| --- | --- | --- |
| `BoolType` | `type` | `boolean` |
| `IntegerType` | `type`, optional `unsigned` (unsigned not shown separately) | `integer`, `bigint`, `serial`, … |
| `DecimalType` | `type`, `precision`, `scale` | `numeric (10, 2)` |
| `FloatType` | `type`, optional `precision` | `double precision` |
| `StringType` | `type`, optional `size` | `character varying (30)` |
| `BinaryType` | `type`, optional `size` | `bytea` |
| `TimeType` | `type`, optional `precision`, `scale` | `timestamp (6)` |
| `JSONType` | `type` | `jsonb` |
| `SpatialType` | `type` | `point` |
| `UUIDType` | `type` | `uuid` |
| `EnumType` | named `type` or first of `values[]` | `status` or first enum literal |
| `UnsupportedType` | raw dialect `type` | `interval`, `bit (8)`, `bit varying (16)`, … |
| `PgTypeKind.Domain` | domain `type` name | domain name (not base type in label) |
| `UnknownType` / other escape hatch | best-effort `type` or `kind` | driver-specific |
| (fallback) | `ColumnType.raw` | raw SQL fragment |
| (fallback) | missing type | `unknown` |

### Expr kinds used in displayed strings

| `Expr.kind` | Where shown | Formatting |
| --- | --- | --- |
| `Literal` | column default, index expression parts | `value` |
| `RawExpr` | column default, index expression parts | `expr` |
| `NamedDefault` | column default (via unwrap) | underlying literal/raw |
| `UnknownExpr` | index/default if encountered | best-effort via guards |

---

## § Not displayed

### A. Mapped in next-data-model, not rendered (`ndm-reserved`)

Fields exist on view-model types for consumers/tests; **DdlTableViewer ignores them**.

| Field | ddlapi origin | Why kept |
| --- | --- | --- |
| `DdlApiColumnRowValue.generatedBy` | `Identity` vs `GeneratedExpr` | Distinguishes sources; viewer badge is always **generated**. |
| `DdlApiColumnTypeValue.kind` | `SchemaType.kind` / `'Raw'` | Typing and tests; viewer uses `label` only. |
| `DdlApiColumnTypeValue.typeName` | `SchemaType.type` | Same. |
| `DdlApiColumnTypeValue.unsigned` | `IntegerType` / `DecimalType` / `FloatType` | Not appended to label today. |
| `DdlApiColumnTypeValue.precision`, `scale`, `size` | numeric/string types | Folded into `label` only. |
| `DdlApiColumnTypeValue.values` | `EnumType.values` | Full enum list not shown — only `label` (name or first value). |
| `DdlApiColumnTypeValue.baseTypeLabel` | `pg:domain.baseType` | Domain base type resolved but not shown separately. |
| `DdlApiColumnTypeValue.schemaName` | domain schema (optional) | Not used in viewer. |
| `DdlApiColumnTypeValue.raw` | `ColumnType.raw` | Exposed on type object; viewer shows `label` copy. |

**Agent rule:** do not add viewer UI for these without product approval; do not delete from
view-model without checking tests and external consumers.

---

### B. ddlapi table/column/index data not mapped by transformer (`ndm-future`)

Present on the **selected table** in ddlapi, intentionally omitted from
`DdlApiSpecTransformer` today.

#### `Table`

| ddlapi field / object | Notes | Suggested tag |
| --- | --- | --- |
| `Table.attrs` except `Comment` | `Charset`, `Collation`, `Check`, `PgAttrKind.Partition`, `Inherits`, `StorageParams`, `Trigger`, … | `ndm-future` |
| `Table.objects` | e.g. `PgObjectKind.ExcludeConstraint` | `ndm-future` |
| `Table.deps` | dependency graph | `out-of-scope` |
| `Table.kind` | discriminant | `out-of-scope` |
| `Table.primaryKey` as index row | PK surfaced via column badges only | `out-of-scope` (by design) |

#### `Column`

| ddlapi field / object | Notes | Suggested tag |
| --- | --- | --- |
| `Column.attrs` except `Comment`, `GeneratedExpr`, `Identity` | `Charset`, `Collation`, `Check`, … | `ndm-future` |
| `ColumnType.null === true` | explicit nullable | `ndm-future` (no “nullable” badge today) |
| `ColumnType.null === undefined` | absent clause | `out-of-scope` |
| `GeneratedExpr.type` | `STORED` / `VIRTUAL` | `ndm-future` |
| `PgAttrKind.Identity` details | `generation`, `seqStart`, `seqIncrement` | `ndm-future` |
| Composite uniqueness | multi-column `UNIQUE` | `ndm-future` (only single-column `isUnique`) |

#### `ForeignKey` (per column chip only today)

| ddlapi field | Notes | Suggested tag |
| --- | --- | --- |
| `ForeignKey.symbol` | constraint name | `ndm-future` |
| `ForeignKey.onUpdate`, `onDelete` | `ReferenceOption` | `ndm-future` |
| `ForeignKey.attrs` | e.g. comments on constraint | `ndm-future` |
| Multi-column FK as one UI element | each column shows its own FK link | `out-of-scope` (by design) |

#### `Index` / `IndexPart`

| ddlapi field | Notes | Suggested tag |
| --- | --- | --- |
| `IndexPart.desc` | `DESC` sort | `ndm-future` |
| `IndexPart.attrs` | `IndexColumnProp`, `IndexOpClass` | `ndm-future` |
| `Index.attrs` except `Comment` | `IndexInclude`, `IndexNullsDistinct`, `IndexType`, `IndexPredicate`, `Concurrently`, `StorageParams` | `ndm-future` |

#### `SchemaType` / `EnumType` extras

| ddlapi field | Notes | Suggested tag |
| --- | --- | --- |
| `EnumType.attrs` | enum-level metadata | `ndm-future` |
| Full `EnumType.values[]` list | only one value may appear in `label` | `ndm-future` |
| `IntegerType.attrs`, `StringType.attrs`, `TimeType.attrs` | type-level attrs | `ndm-future` |
| Domain `null`, `default`, `checks` on `pg:domain` | domain definition | `ndm-future` |

---

### C. Realm / schema scope — not part of single-table viewer (`out-of-scope`)

| ddlapi construct | Reason |
| --- | --- |
| `Realm.ddlapi` | version stamp |
| `Realm.attrs`, `Realm.objects` | realm-level |
| `Schema.attrs`, `Schema.objects` | schema-level types, domains as objects, triggers, … |
| `Schema.tables` list | table picker is external (`TableKey`) |
| Other tables in the same schema | navigation target only via FK link builder |
| `View` and `View.*` | views not supported in ddlapi parser (`Schema.views` commented out) |
| `SchemaObject` members never attached to one table | `Check`, standalone `EnumType` object rows, `NamedDefault` as object, generic `UnknownObject` |
| `Check` as table/column constraint | not mapped |
| `NamedDefault.attrs` | not mapped |

---

### D. PostgreSQL escape-hatch attrs/objects — parsed, not shown

Emitted by `buildFromDdl` (see `postgres.constants.ts` / ddlapi-using skill). None are mapped
to the table-oriented spec except **`Identity`** and **`GeneratedExpr`** (core attr) on columns.

| Kind | Typical location | Tag |
| --- | --- | --- |
| `PgAttrKind.Partition` | `table.attrs` | `ndm-future` |
| `PgAttrKind.Inherits` | `table.attrs` | `ndm-future` |
| `PgAttrKind.StorageParams` | `table.attrs`, `index.attrs` | `ndm-future` |
| `PgAttrKind.Trigger` | `table.attrs` | `ndm-future` |
| `PgAttrKind.IndexInclude` | `index.attrs`, unique constraint attrs | `ndm-future` |
| `PgAttrKind.IndexNullsDistinct` | `index.attrs` | `ndm-future` |
| `PgAttrKind.IndexType` | `index.attrs` (GIN, GiST, …) | `ndm-future` |
| `PgAttrKind.IndexPredicate` | partial index `WHERE` | `ndm-future` |
| `PgAttrKind.Concurrently` | `index.attrs` | `ndm-future` |
| `PgAttrKind.IndexColumnProp` | `indexPart.attrs` | `ndm-future` |
| `PgAttrKind.IndexOpClass` | `indexPart.attrs` | `ndm-future` |
| `PgObjectKind.ExcludeConstraint` | `table.objects` | `ndm-future` |
| `PgObjectKind.CompositeType` | `schema.objects` | `out-of-scope` (not table-scoped) |
| `PgObjectKind.RangeType` | `schema.objects` | `out-of-scope` |
| `PgObjectKind.Domain` as schema object | `schema.objects` | `out-of-scope` (column uses domain type in label only) |

---

### E. Core attrs never shown

| `AttrKind` | Tag |
| --- | --- |
| `Charset` | `ndm-future` |
| `Collation` | `ndm-future` |
| `Check` (incl. named checks, nested `attrs`) | `ndm-future` |
| `UnknownAttr` | `ndm-future` / case-by-case |

---

### F. Parser / statement gaps (`parser-gap`)

ddlapi **model** includes types that the **parser** does not populate from typical DDL, or
statements are skipped (`DdlErrorKind.OutOfScopeStatement`). Absence in the viewer is expected.

| Area | Tag |
| --- | --- |
| `View`, `View.def`, `View.columns` | `parser-gap` + `out-of-scope` |
| `ALTER`, `DROP`, DML, `CREATE VIEW`, sequences, extensions, … | `parser-gap` |
| `CREATE TABLE … PARTITION OF …` | `parser-gap` |
| Unresolved FK / LIKE source (partial realm) | `parser-gap` — FK chip omitted when `refTable` / `refColumns` are absent |

---

### G. Diffs and infrastructure

| Item | Tag / status |
| --- | --- |
| Column / index title-row diffs (badges, type, names) | **Implemented** — `DdlTableDiffsViewer`, property-row aggregators |
| `AdditionalInfoRow` diffs (default, generated expression) | `ndm-future` |
| Table-level / section-header diff chrome | `ndm-future` |
| Diff metadata on all `DdlApiTableOrientedSpecWithDiffs` fields | partial — extend transformer + aggregators per field |
| `Realm` wrapper objects in merged source | extraction only |
| Tree node kinds `TABLE`, `COLUMNS`, `COLUMN`, `INDEXES`, `INDEX` | structure, not ddlapi |

---

## § Quick matrices

### SchemaObject union (`schema.ts`)

| Member | Displayed? | How / tag |
| --- | --- | --- |
| `Table` | **Yes** | viewer root |
| `Index` | **Partial** | `table.indexes` only, not PK |
| `ForeignKey` | **Partial** | per-column FK badge + link |
| `EnumType` | **Partial** | via column type `label` only |
| `Check` | No | `ndm-future` |
| `NamedDefault` | **Partial** | via `Column.default` formatting only |
| `View` | No | `parser-gap` |
| `UnknownObject` | No | `ndm-future` / case-by-case |

### `ReferenceOption` (`onUpdate` / `onDelete`)

Not displayed — tag **`ndm-future`**.

---

## § Testing guidance for agents

1. **Fixture assertions** — prefer checking rendered text/badges in Storybook or component
   tests against § Displayed; do not expect fields listed under § Not displayed unless a ticket
   explicitly expands scope.

2. **Transformer unit tests** — `packages/next-data-model/tests/unit-tests/ddlapi-spec-transformer.test.ts`
   covers `defaultValue`, `generatedExpression`, index `description`; extend here for new
   **`ndm-future`** mappings before viewer work.

3. **Regression guard** — if ddlapi starts emitting a new attr on columns, default expectation
   is **no viewer change** until classified from **`ndm-future`** → product → viewer.

4. **Do not treat as bugs (baseline):**
   - no Indexes row for primary key;
   - no **nullable** badge;
   - `public` schema name hidden;
   - composite unique not on columns;
   - enum values list not expanded;
   - FK actions / constraint names hidden;
   - partial-index / INCLUDE / opclass hidden.

---

## § Maintenance

Update this file when:

- `DdlApiSpecTransformer` or `node-value.ts` field contracts change;
- `DdlTableViewer` adds/removes rows, badges, or sections;
- product scope for single-table viewer changes.

Last reviewed against codebase: 2026-06-24.
