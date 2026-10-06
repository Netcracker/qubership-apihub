# Index

A table-level structure that speeds up queries on some columns or expressions. A unique index also
enforces uniqueness; the doc view treats unique constraints and unique indexes as one concept.

## Real-world usage

How often each pattern appears in real-world schemas, on the scale defined in
[../features/doc-view.md](../features/doc-view.md#prevalence-scale), and how the doc view handles it.
Table and column names come from the fixture in the **Fixture** column (relative to
`packages/samples/ddlapi/`); **none** marks a pattern without a fixture yet.

| Pattern | Prevalence | In the doc view | Fixture |
| --- | --- | --- | --- |
| Non-unique index on an FK column | Common | Row in `Indexes` | none |
| Single-column unique index on a natural key (`users_login_key` on `users.login`) | Common | Row with **unique**; **unique** also on the column | `e2e-scenarios/users`, `indexes/one-column-unique` |
| Single-column index on a searched column (`users_email_idx` on `users_plus_idx.email`) | Common | Row in `Indexes` | `e2e-scenarios/users_plus_idx`, `indexes/one-column` |
| Composite index (`users_complex_idx` on `login, email`; `animals_complex_idx` on `title, description`) | Occasional | Row with the part list `(login, email)` | `e2e-scenarios/users_plus_idx`, `e2e-scenarios/petstore` |
| Unique composite index (`idx_t_user_org` on `user_id, org_id`) | Occasional | Row with **unique**; columns get no **unique** badge | `indexes/nulls-not-distinct`, `indexes/two-columns-unique` |
| Partial index (`idx_t_active_owner` … `WHERE status = 'active'`) | Occasional | Row without the predicate | `indexes/partial` |
| Expression index (`idx_t_name_lower` on `lower(name)`) | Rare | Row with the formatted expression in the part list | `indexes/expression` |
| Covering index (`idx_t_order` … `INCLUDE (customer_id)`) | Rare | Row without the included columns | `indexes/covering-include` |
| Unnamed index | Rare | Row titled `<unnamed>` | `indexes/unnamed-index`, `indexes/unnamed-index-unique` |

## Display

The `Indexes` section lists `Table.indexes` after the columns; each index is one non-expandable row.

| Element | Condition | Source |
| --- | --- | --- |
| Title | always | `Index.name`, or `<unnamed>` |
| Part list `(c1, c2)` | ≥1 part | column names or formatted expressions, ordered by `seqNo` |
| **unique** badge | unique index | `Index.unique` |
| Description row | detailed mode, comment present | `Index.attrs` → `Comment.text` |

- A single-column unique index also puts **unique** on its column; the index is still listed.
- Non-unique index membership is not shown on columns.
- The primary key is not listed.
- `DESC`, INCLUDE, operator classes, index type, and partial-index predicates are not shown.

## Example

```sql
CREATE TABLE orders (
    id integer PRIMARY KEY, customer_id integer NOT NULL, status text NOT NULL, total numeric
);
CREATE INDEX idx_orders_customer ON orders (customer_id);
CREATE UNIQUE INDEX uq_orders_ref ON orders (customer_id, status);
CREATE INDEX ON orders (total);
```

```text
Indexes
  idx_orders_customer  (customer_id)
  uq_orders_ref        (customer_id, status)  unique
  <unnamed>            (total)
```
