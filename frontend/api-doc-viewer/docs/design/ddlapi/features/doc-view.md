# DB schema doc view

A human-friendly, table-focused view of a DB schema for people who query data (for example,
building reports in Apache Superset). The view renders **one table** and the entities attached to
it, in a tree consistent with the JSON Schema doc view. Not all ddlapi data is shown: the goal is
readability, not completeness. The full list of what is and is not shown is in
[../display-coverage.md](../display-coverage.md).

**Dialect scope:** SQL core types and PostgreSQL-specific features. MySQL / MariaDB-specific data
(`unsigned`, `FLOAT(M,D)` precision, `BINARY(n)` size, `VIRTUAL` generated columns) is not shown.

## Principles

1. **Common patterns are immediately visible; rare ones are secondary or omitted.** Each entity page
   rates its patterns on the [prevalence scale](#prevalence-scale).
2. **Show deviations from defaults.** SQL columns are nullable by default, so only `not null` is
   marked; `public` is the default schema, so its name is hidden.
3. **Identifiers are shown exactly as stored.** Names and type names come from ddlapi without case
   changes; PostgreSQL has already folded unquoted identifiers to lowercase.
4. **Reuse JSON Schema components.** Descriptions, default values, and value lists use the same row
   components as the JSON Schema viewer.
5. **Details live in detailed mode.** Descriptions and additional-info rows (`Values`, `Default`,
   `As`) appear only in `DETAILED_DISPLAY_MODE`; simple mode shows title rows only.

## Prevalence scale

Entity pages rate how often a pattern appears in real-world schemas. The rating is a design
judgement, not a measurement; it decides how prominent a pattern is in the doc view.

| Prevalence | Meaning | Display priority |
| --- | --- | --- |
| **Common** | Present in most schemas and most tables | Readable at a glance on the column or index row |
| **Occasional** | Present in many schemas, but not in most tables | Shown correctly; may sit in a follow-on row or detailed mode |
| **Rare** | Specialized schemas or dialect-specific features | May be shown with less detail or omitted |

## Layout

```text
orders                                        ← table name (h1)
reporting                                     ← schema name, only when not public
Customer orders placed through the storefront ← description (detailed)
Columns
  id           integer                  PK
  customer_id  integer                  not null  FK customers.id
  status       order_status             not null
    Values     pending  shipped  delivered
  total        numeric (10, 2)
  created_at   timestamp (3)            not null
    Default    now()
  order_ref    text                     generated
    As         'ORD-' || id::text
Indexes
  idx_orders_customer  (customer_id)
  uq_orders_ref        (customer_id, status)  unique
```

Entity pages: [table](../entities/table.md), [column](../entities/column.md),
[primary key](../entities/primary-key.md), [foreign key](../entities/foreign-key.md),
[index](../entities/index.md), [user-defined types](../entities/user-defined-types.md).

## Similarity with JSON Schema

| DB concept | JSON Schema analog | Rendering |
| --- | --- | --- |
| Table / column description | `description` | identical row component |
| Column name | property name | identical title |
| Column type label | `type` | same type label position; parameters folded into the label |
| **not null** | `nullable` (inverted default) | badge on the not-null side of the default |
| Default | `default` | identical additional-info row |
| Enum values | `enum` | same value list row, labelled `Values` |
| **generated** + `As` | `readOnly` | badge plus an expression row parallel to `Default` |
| **PK**, **unique**, **FK** + link | — | DB-specific badges |
| Indexes section | — | DB-specific section |

## Decisions

1. **FK as badge + link on the column.** Each source column shows **FK** followed by a link to the
   referenced table. There is no separate foreign-keys section; composite FKs show one link per
   column.
2. **FK link text is a qualified column name.** `table.column`, prefixed with the schema when the
   target is not in `public`.
3. **`not null` is suppressed by `PK`.** Primary-key columns are implicitly not null.
4. **FK badges come last.** The free-text link after **FK** would split any badges that follow it.
5. **Non-unique index membership is not annotated on columns.** Indexes are performance hints, not
   data constraints; the Indexes section is the complete list.
6. **Index rows are not expandable.** Column definitions are already on the same page.
7. **Type parameters stay in the type label** (`character varying (30)`, `numeric (10, 2)`), with a
   space before the parenthesis.
8. **Badge labels are lowercase words except abbreviations:** `PK`, `FK`, `unique`, `not null`,
   `generated`.
