# Table

A named structure of rows and columns in one schema (for example `public.orders`). The root of the
doc view.

## Real-world usage

How often each pattern appears in real-world schemas, on the scale defined in
[../features/doc-view.md](../features/doc-view.md#prevalence-scale), and how the doc view handles it.
Table and column names come from the fixture in the **Fixture** column (relative to
`packages/samples/ddlapi/`); **none** marks a pattern without a fixture yet.

| Pattern | Prevalence | In the doc view | Fixture |
| --- | --- | --- | --- |
| A handful of columns (`users`: 6) | Common | Every column is one row; no paging or grouping | `e2e-scenarios/users` |
| Single-column primary key `id`: integer (`users.id`) or UUID (`petstore.animals.id`) | Common | **PK** badge on that column | `e2e-scenarios/users`, `e2e-scenarios/petstore` |
| Several foreign keys (`employees_projects`: 2) | Common | **FK** badge and link on each referencing column | `e2e-scenarios/employees_projects` |
| Junction table: composite primary key over two FK columns (`employees_projects`: `employee_id`, `project_id`) | Occasional | **PK** and **FK** badges on both key columns | `e2e-scenarios/employees_projects` |
| Wide table (50+ columns) | Occasional | Same layout as any table; no extra navigation | none |
| No primary key | Occasional | No **PK** badge anywhere | `indexes/one-column` |
| Table comment | Rare | Description row under the header (detailed mode) | `table-descriptions/short-description`, `table-descriptions/long-description` |

## Display

| Element | Condition | ddlapi source |
| --- | --- | --- |
| Table name (h1) | always, unless `noHeading` | `Table.name` |
| Schema name row | schema is not `public` | parent `Schema.name` |
| Description | detailed mode, comment present | `Table.attrs` → `Comment.text` |
| `Columns` section | ≥1 column | `Table.columns` |
| `Indexes` section | ≥1 index | `Table.indexes` (primary key excluded) |

## Example

```sql
CREATE SCHEMA reporting;
CREATE TABLE reporting.sales_summary (id integer);
COMMENT ON TABLE reporting.sales_summary IS 'Monthly sales aggregated by region.';
```

```text
sales_summary
reporting
Monthly sales aggregated by region.
Columns
  id  integer
```
