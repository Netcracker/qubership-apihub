# User-defined types

PostgreSQL types created with `CREATE TYPE` or `CREATE DOMAIN` and used as column types.

## Real-world usage

How often each pattern appears in real-world schemas, on the scale defined in
[../features/doc-view.md](../features/doc-view.md#prevalence-scale), and how the doc view handles it.
Table and column names come from the fixture in the **Fixture** column (relative to
`packages/samples/ddlapi/`); **none** marks a pattern without a fixture yet.

| Kind | Definition | Prevalence | In the doc view | Fixture |
| --- | --- | --- | --- | --- |
| Enum (`mood`: `happy`, `sad`, `neutral`) | ordered list of string labels (`AS ENUM (…)`) | Occasional (status and category columns) | Type name as the label, `Values` row | `display-mode-simple/enum-values`, `column-types/enum` |
| Domain (`positive_int` over `integer`) | alias over a base type with optional NOT NULL / CHECK | Rare | Domain name as the label | `column-types/domain` |
| Composite | named record of typed fields | Rare | Type name as the label | none |
| Range | contiguous range of a subtype (`int4range`, `tsrange`, …) | Rare | Type name as the label | none |

Enum values are string literals and are case-sensitive.

## Display

| Kind | Type label | Extra rows |
| --- | --- | --- |
| Enum | the enum type name | `Values` row with every label (detailed mode) |
| Domain | the domain name (base type is resolved but not shown) | — |
| Composite, range, other | the type name, or `ColumnType.raw` | — |
