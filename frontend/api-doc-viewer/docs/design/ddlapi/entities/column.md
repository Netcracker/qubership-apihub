# Column

A named, typed slot of a table row. Can take part in the primary key, foreign keys, unique
indexes, and non-unique indexes at the same time.

## Real-world usage

How often each pattern appears in real-world schemas, on the scale defined in
[../features/doc-view.md](../features/doc-view.md#prevalence-scale), and how the doc view handles it.
Table and column names come from the fixture in the **Fixture** column (relative to
`packages/samples/ddlapi/`); **none** marks a pattern without a fixture yet.

| Pattern | Prevalence | In the doc view | Fixture |
| --- | --- | --- | --- |
| Integer, character varying, character, boolean, timestamp types (`users`) | Common | Type label with parameters (`character varying (30)`) | `e2e-scenarios/users`, `column-types` |
| NOT NULL on required columns (`users.login`, `users.registration_date`) | Common | **not null** badge (hidden by **PK**) | `e2e-scenarios/users` |
| Nullable optional columns (`users.email`, `projects.description`) | Common | Nothing — nullable is the SQL default | `e2e-scenarios/users`, `e2e-scenarios/projects` |
| Default value: literal (`users.enabled` = `true`) or function call (`petstore.animals.id` = `gen_random_uuid()`) | Common | `Default` row (detailed mode) | `e2e-scenarios/users`, `e2e-scenarios/petstore` |
| UUID type (`petstore.animals.id`) | Common | Type label `uuid` | `e2e-scenarios/petstore`, `column-types/uuid` |
| Enum type (`t.feeling` of type `mood`) | Occasional | Enum type name as the label, `Values` row (detailed mode) | `display-mode-simple/enum-values`, `column-types/enum` |
| JSON / JSONB column | Occasional | Type label only; the content is opaque | `column-types/json`, `column-types/jsonb` |
| Identity column (`users.id`) | Occasional | **generated** badge | `e2e-scenarios/users`, `column-constraints/generated-identity` |
| Expression-generated column (`t.label`) | Occasional | **generated** badge, `As` row (detailed mode) | `column-constraints/generated-expression` |
| Binary (`petstore.animals.photo`) and geometric types | Rare | Type label only | `e2e-scenarios/petstore`, `column-types/point` |
| Array types | Rare | Type label only | none |

## Display

Title row: `name  type-label  badges`.

| Element | Condition | Source |
| --- | --- | --- |
| Name | always | `Column.name` |
| Type label | always; parameters folded in | `Column.type` → formatted label, fallback `ColumnType.raw`, then `unknown` |
| **PK** | column in the primary key | [primary-key.md](primary-key.md) |
| **unique** | column is the only part of a unique index | `Table.indexes` |
| **not null** | `ColumnType.null === false`, and **PK** is not shown | `Column.type.null` |
| **generated** | IDENTITY or `GENERATED ALWAYS AS` | `Identity` / `GeneratedExpr` attr |
| **FK** + link | one per referenced target, always last | [foreign-key.md](foreign-key.md) |
| Description row | detailed mode, comment present | `Column.attrs` → `Comment.text` |
| `Values` row | detailed mode, enum type | `EnumType.values` |
| `Default` row | detailed mode, default present | `formatDdlExpr(Column.default)` |
| `As` row | detailed mode, expression-generated column | `GeneratedExpr.expr` |

- Nullable is the SQL default and is never marked.
- The **generated** badge text does not distinguish identity from expression; only expression
  columns get an `As` row. A generated column has no `Default` row.
- `not null` is not suppressed by **generated**.
- Type labels by kind are listed in [../display-coverage.md](../display-coverage.md#column-type-label).

## Examples

```sql
CREATE TYPE order_status AS ENUM ('pending', 'shipped', 'delivered');
CREATE TABLE products (
    id          integer        PRIMARY KEY,
    name        varchar(100)   NOT NULL,
    price       decimal(10,2)  NOT NULL,
    status      order_status   NOT NULL,
    updated_at  timestamp(3)   DEFAULT now(),
    full_name   text           GENERATED ALWAYS AS (upper(name)) STORED
);
```

```text
id          integer                  PK
name        character varying (100)  not null
price       numeric (10, 2)          not null
status      order_status             not null
  Values    pending  shipped  delivered
updated_at  timestamp (3)
  Default   now()
full_name   text                     generated
  As        upper(name)
```
