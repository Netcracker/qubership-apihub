# Foreign key

A constraint linking referencing columns of this table to referenced columns of another table
(or of the same table).

## Real-world usage

How often each pattern appears in real-world schemas, on the scale defined in
[../features/doc-view.md](../features/doc-view.md#prevalence-scale), and how the doc view handles it.
Table and column names come from the fixture in the **Fixture** column (relative to
`packages/samples/ddlapi/`); **none** marks a pattern without a fixture yet.

| Pattern | Prevalence | In the doc view | Fixture |
| --- | --- | --- | --- |
| Single-column FK to the `id` of another table (`employees.user_id` → `users.id`) | Common | **FK** badge and link `users.id` | `e2e-scenarios/employees` |
| No explicit ON DELETE / ON UPDATE action (`employees.user_id`) | Common | Nothing — actions are never shown | `e2e-scenarios/employees` |
| FK to a table in another schema (`t.ref_id` → `custom.parent.id`) | Occasional | Link text `custom.parent.id` | `column-constraints/foreign-key-custom-schema` |
| ON DELETE CASCADE | Occasional | Not shown | none |
| ON DELETE SET NULL | Rare | Not shown | none |
| Composite FK, FK to a non-PK unique column, or self-referential FK | Rare | One **FK** badge and link per referencing column | none |
| Several FKs from one column or to the same target table | Rare | One **FK** badge and link per target | none |

## Display

- Each referencing column shows **FK** followed by a link to the referenced column, as the last
  badge on the title row.
- Link text: `table.column` when the target is in `public`, `schema.table.column` otherwise.
- A column referencing several targets shows one **FK** badge and link per target.
- The link is produced by the host's `navigationLinkBuilder` and rendered by
  `navigationLinkComponent` (default: `DefaultNavigationLink`).
- A target that cannot be resolved (partial realm) shows no badge.
- Constraint name, ON DELETE, and ON UPDATE are not shown.

## Example

```sql
CREATE SCHEMA finance;
CREATE TABLE customers (id integer PRIMARY KEY);
CREATE TABLE finance.currencies (id integer PRIMARY KEY);
CREATE TABLE orders (
    customer_id  integer  REFERENCES customers(id),
    currency_id  integer  REFERENCES finance.currencies(id)
);
```

```text
customer_id  integer  FK customers.id
currency_id  integer  FK finance.currencies.id
```
