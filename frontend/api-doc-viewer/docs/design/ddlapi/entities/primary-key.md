# Primary key

A table-level constraint that uniquely identifies each row. One per table; backed by an implicit
unique index; its columns are implicitly NOT NULL.

## Real-world usage

How often each pattern appears in real-world schemas, on the scale defined in
[../features/doc-view.md](../features/doc-view.md#prevalence-scale), and how the doc view handles it.
Table and column names come from the fixture in the **Fixture** column (relative to
`packages/samples/ddlapi/`); **none** marks a pattern without a fixture yet.

| Pattern | Prevalence | In the doc view | Fixture |
| --- | --- | --- | --- |
| Single-column key `id`: integer (`users.id`) or UUID (`petstore.animals.id`) | Common | **PK** badge on the column | `e2e-scenarios/users`, `e2e-scenarios/petstore` |
| Auto-increment key: `IDENTITY` (`users.id`) or `SERIAL` (`t.id`) | Common | **PK** badge; **generated** for `IDENTITY` | `e2e-scenarios/users`, `column-constraints/generated-serial` |
| Composite key in a junction table (`employees_projects`: `employee_id`, `project_id`) | Occasional | **PK** badge on each key column | `e2e-scenarios/employees_projects` |
| Composite natural key in an entity table | Rare | **PK** badge on each key column | none |
| No primary key | Occasional | No **PK** badge | `indexes/one-column` |

## Display

- Every column of the key shows a **PK** badge; composite keys mark each participating column.
- **PK** suppresses **not null** on the same column.
- The primary key is never listed in the `Indexes` section.

## Example

```sql
CREATE TABLE orders (
    id         integer    PRIMARY KEY,
    placed_at  timestamp  NOT NULL,
    note       text
);
```

```text
id         integer    PK
placed_at  timestamp  not null
note       text
```
