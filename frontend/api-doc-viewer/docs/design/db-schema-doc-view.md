# DB Schema Doc View — Design

A human-friendly, table-focused view of a DB schema for users who query data (e.g. building reports in Apache Superset). The view renders a single table and its related entities in a tree structure consistent with how JSON schema is presented in the existing api-doc-viewer Doc View. Not all ddlapi data is shown — the goal is readability, not completeness.

**Dialect scope:** this design covers SQL core types and PostgreSQL-specific features. MySQL / MariaDB-specific features are noted where they appear but are out of scope for the current version.

---

## 1. Relational Schema Entities — Quick Reference

This section summarises the entities relevant to the Doc View, their key characteristics, standard terminology, and the frequency of different cases. The frequency notes drive the design principle: **typical cases should be immediately visible; rare cases may require expansion or secondary placement.**

### 1.1 Table

A named, two-dimensional structure of rows and columns, belonging to a schema (namespace). The primary unit of storage and the focus of this Doc View.

**Key characteristics:**

- Has a fixed set of columns with defined types and constraints.
- Optionally has a primary key, foreign keys, and indexes.
- Belongs to exactly one schema (e.g. `public.orders`).

**Typical / rare:**


| Case                                                                                                                               | Frequency                               |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 5–30 columns                                                                                                                       | Typical                                 |
| Single-column integer or UUID primary key named `id`                                                                               | Typical                                 |
| 2–5 foreign keys to other tables                                                                                                   | Typical                                 |
| Junction / association table (e.g. `order_items`, `user_roles`) — small table, composite PK over two FK columns, few other columns | Common special case                     |
| Wide table (50+ columns) — often a legacy or reporting-layer table                                                                 | Less typical                            |
| No primary key — log tables, staging/import tables, views                                                                          | Less typical                            |
| Table comment / description                                                                                                        | Uncommon in practice (rarely filled in) |


---

### 1.2 Column

A named, typed slot that every row in the table must provide a value for (unless nullable).

**Key characteristics:**

- Has a data type and an optional nullability constraint (NOT NULL or nullable).
- May have a default value, used when no value is provided on INSERT.
- Can participate in the primary key, a foreign key, unique constraints, and non-unique indexes — independently and simultaneously.
- Cannot hold a back-reference to which indexes include it (index membership is declared at the index level, not the column level).

**Terminology:**

- **NOT NULL** — the column must always have a value; no NULL is permitted.
- **Nullable** — NULL is a valid value (the default in SQL when no constraint is declared).
- **Default** — a value applied automatically on INSERT if the caller omits the column.

**Typical / rare:**


| Case                                                                                                     | Frequency                            |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| NOT NULL on "core" columns (`id`, `created_at`, status fields)                                           | Typical                              |
| Nullable on optional attributes (`description`, `deleted_at`, `note`)                                    | Typical                              |
| Default value on timestamps (`current_timestamp()`), booleans (`false`), status (`'active'`)             | Common                               |
| Integer, varchar/text, boolean, timestamp, decimal types                                                 | Typical types                        |
| UUID type                                                                                                | Common in modern applications        |
| Enum type — fixed set of string values baked into the column definition *(dialect-specific: PostgreSQL)* | Present but not universal            |
| JSON / JSONB column — opaque blob from a query perspective                                               | Increasingly common in modern apps   |
| Default value as a literal (`0`, `'pending'`)                                                            | Common                               |
| Default value as a function call (`uuid()`, `gen_random_uuid()`, `current_timestamp()`)                  | Common                               |
| Generated / computed column (value derived from other columns, not stored by the caller)                 | Less typical                         |
| Binary / spatial / array types                                                                           | Rare in general-purpose OLTP schemas |


---

### 1.3 Primary Key (PK)

A constraint that uniquely identifies each row. Backed by a unique index automatically. Declared at the table level; one PK per table.

**Key characteristics:**

- Can be **single-column** (most common) or **composite** (spanning multiple columns).
- Columns in the PK are implicitly NOT NULL.
- Often auto-generated (auto-increment integer or UUID).

**Typical / rare:**


| Case                                                                                     | Frequency                                 |
| ---------------------------------------------------------------------------------------- | ----------------------------------------- |
| Single-column PK, integer or UUID, named `id`                                            | Typical                                   |
| Auto-increment (`SERIAL`, `IDENTITY`, `AUTO_INCREMENT`)                                  | Typical                                   |
| Composite PK in a junction table (e.g. `(user_id, role_id)`)                             | Common for association tables             |
| Composite PK in a regular entity table (natural key, e.g. `(country_code, postal_code)`) | Less typical                              |
| No PK                                                                                    | Less typical (log tables, staging tables) |


---

### 1.4 Foreign Key (FK)

A constraint that links one or more columns in this table to the primary key (or a unique key) of another table, enforcing referential integrity.

**Key characteristics:**

- Can be **single-column** (most common) or **composite** (multiple columns together reference a composite key in another table).
- References a specific table and column(s) — the **target** (or *referenced*) table and column(s).
- The source columns are the **referencing** columns; they hold the value that must exist in the target.
- Optional **ON DELETE** and **ON UPDATE** actions define what happens to the referencing row when the target row is deleted or updated.

**Terminology:**

- **Referencing table/columns** — the table that holds the FK (this table).
- **Referenced table/columns** — the table being pointed at.
- **ON DELETE CASCADE** — delete this row when the target is deleted.
- **ON DELETE SET NULL** — set FK column(s) to NULL when the target is deleted.
- **ON DELETE RESTRICT / NO ACTION** — prevent deletion of the target if referencing rows exist (the default in most engines).

**Typical / rare:**


| Case                                                                                 | Frequency    |
| ------------------------------------------------------------------------------------ | ------------ |
| Single-column FK to the `id` column of another table                                 | Typical      |
| No explicit ON DELETE / ON UPDATE action declared (engine default applies)           | Typical      |
| ON DELETE CASCADE — cascading deletes (e.g. `order_items → orders`)                  | Common       |
| ON DELETE SET NULL — nullifying the FK on parent deletion                            | Less typical |
| Composite FK (referencing a composite natural key in another table)                  | Less typical |
| FK to a non-PK unique column (e.g. FK to `users.email`)                              | Less typical |
| Self-referential FK (e.g. `employees.manager_id → employees.id` for tree structures) | Less typical |
| Multiple FKs from this table to the same target table                                | Rare         |


---

### 1.5 Index

A data structure that accelerates queries on specific columns. Declared at the table level.

**Key characteristics:**

- Can be **single-column** or **composite** (multi-column); column order matters for composite indexes.
- **Unique index** — also enforces a uniqueness constraint (no two rows may have the same value combination in the indexed columns).
- The PK is always backed by a unique index (implicit — not listed separately as an "index").
- A unique constraint and a unique index are effectively the same thing in most engines; the Doc View treats them as one concept.

**Terminology:**

- **Partial index** — an index with a WHERE clause; applies only to a subset of rows.
- **Expression index** — indexed on a function of a column rather than the column value directly.

**Typical / rare:**


| Case                                                                                          | Frequency                                                     |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Non-unique index on a FK column (query optimisation best practice)                            | Typical                                                       |
| Single-column unique index on a natural key (`email`, `slug`, `code`)                         | Common                                                        |
| Single-column non-unique index on a frequently filtered column (`status`, `created_at`)       | Common                                                        |
| Composite (multi-column) index for a specific query pattern                                   | Less typical in general; present in performance-tuned schemas |
| Unique composite index (e.g. `(user_id, role_id)` on a junction table without a composite PK) | Less typical                                                  |
| Partial index (filtered)                                                                      | Less typical; PostgreSQL-specific                             |
| Expression / functional index                                                                 | Rare                                                          |


---

### 1.6 User-Defined Types (PostgreSQL)

PostgreSQL allows defining custom types as named schema objects. A column can use any of these types in place of built-in types. All four kinds belong to a schema namespace and are created with `CREATE TYPE`.

**Composite types**
A named record type — a fixed, ordered set of named fields each with its own type, analogous to a struct. Created with `CREATE TYPE name AS (field1 type1, field2 type2, ...)`. A column holding a composite value is addressed with dot notation: `(col).field_name`. Every table also implicitly defines a composite type of the same name.

**Enumerated types**
A named ordered list of string labels. Created with `CREATE TYPE name AS ENUM ('label1', 'label2', ...)`. Values have a defined ordering (useful for `ORDER BY` and `<`/`>` comparisons). Unlike MySQL's inline column-level ENUM, PostgreSQL's enum is a first-class schema object. *In scope:* the Doc View renders the values list (see §2.2).

**Domains**
A named type alias over an existing base type, optionally restricted with `NOT NULL` and/or `CHECK` constraints. Created with `CREATE DOMAIN name AS base_type [DEFAULT expr] [CONSTRAINT ...]`. Example: `CREATE DOMAIN email_address AS text CHECK (VALUE ~ '@')`. From a consumer's perspective, a domain column behaves identically to its base type, with an additional validation layer.

**Range types**
A type representing a contiguous range of values of a subtype. PostgreSQL provides built-in range types (`int4range`, `int8range`, `numrange`, `tsrange`, `tstzrange`, `daterange`) and supports custom range types via `CREATE TYPE name AS RANGE (SUBTYPE = type)`. Used for date/time windows, numeric intervals, and bounded quantities. Rendered as `range<subtype>` — e.g. `range<date>`, `range<integer>` — following the same `baseType<qualifier>` convention as `string<date-time>` in JSON schema.

**Typical / rare:**


| Case                          | Frequency                                                               |
| ----------------------------- | ----------------------------------------------------------------------- |
| Enum type column *(in scope)* | Present but not universal; common for status and category fields        |
| Domain type column            | Present in carefully normalised schemas; less common                    |
| Composite type column         | Less common; data is usually normalised into separate tables instead    |
| Range type column             | Specialised; common in scheduling, reservation, and time-series schemas |


---

### 1.7 Naming Conventions and Case

**PostgreSQL identifier folding**

PostgreSQL folds all unquoted identifiers to **lowercase** at parse time. This means `CREATE TABLE Orders` and `CREATE TABLE orders` produce the same table named `orders`. To preserve mixed or upper case, an identifier must be double-quoted: `CREATE TABLE "Orders"` stores the name `Orders` exactly. This is the opposite of the SQL standard, which folds unquoted identifiers to uppercase — PostgreSQL deliberately chose lowercase as the community default.

**Enum values** are string literals, not identifiers, and are always case-sensitive: `'Pending'` and `'pending'` are distinct values.

**SQL keywords and constraint labels**

SQL keywords — `SELECT`, `CREATE TABLE`, `NOT NULL`, `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE` — are syntactically case-insensitive: `not null` and `NOT NULL` are equivalent to the parser. The convention of writing them in UPPERCASE is a long-standing practice that predates syntax highlighting. In the era of plain-text editors, capitalising keywords was the only way to visually separate the structural grammar of a statement from the user-defined names embedded within it. The convention has persisted even with modern tooling because it remains genuinely useful: a quick scan of a DDL statement immediately shows which words are language structure and which are schema-defined names.

`PK`, `FK`, `UNIQUE`, and `NOT NULL` used as Doc View chips follow the same convention. They are abbreviations of SQL constraint keywords, not user-defined names. Displaying them in uppercase signals that these are structural annotations about the column's role in the schema — visually distinct from the lowercase identifiers (column name, type name) that appear on the same row. The resulting visual split mirrors how DDL is conventionally written:

```sql
CREATE TABLE orders (
    id          integer      NOT NULL PRIMARY KEY,
    customer_id integer      REFERENCES customers(id),
    status      order_status NOT NULL
);
```

In the Doc View row for `id`, `integer` is a lowercase type name and `NOT NULL`, `PK` are uppercase constraint chips — the same distinction, different medium.

**Established conventions:**


| Entity        | Convention                    | Example                                    |
| ------------- | ----------------------------- | ------------------------------------------ |
| Schema        | lowercase                     | `public`, `reporting`, `auth`              |
| Table         | `snake_case`, all lowercase   | `order_items`, `user_roles`                |
| Column        | `snake_case`, all lowercase   | `customer_id`, `created_at`                |
| Index         | lowercase, descriptive prefix | `idx_orders_customer_id`, `uq_users_email` |
| FK constraint | lowercase, descriptive prefix | `fk_orders_customer_id`                    |
| Enum type     | lowercase                     | `order_status`, `payment_method`           |
| Enum values   | lowercase                     | `'pending'`, `'shipped'`                   |


**Typical / rare:**


| Case                                                                       | Frequency                                                                                               |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| All-lowercase `snake_case` across all identifiers                          | Typical — the dominant PostgreSQL community style                                                       |
| Lowercase single-word schema names (`public`, `auth`, `core`)              | Typical                                                                                                 |
| Lowercase enum values                                                      | Common                                                                                                  |
| Mixed-case identifiers with double-quoting — `"customerId"`, `"OrderDate"` | Less typical — usually produced by ORMs (Hibernate, some JPA defaults) or migrated from other databases |
| `PascalCase` table names with double-quoting — `"Customer"`, `"OrderItem"` | Less typical — Rails pre-4 convention, some ORMs                                                        |
| `ALL_CAPS` identifiers                                                     | Rare — occasionally seen in schemas migrated from Oracle or DB2                                         |


**Impact on the Doc View:**

Identifiers are displayed exactly as stored in ddlapi (the `name` and `type` fields carry the already-folded or quoted value — no transformation is applied). In practice, the vast majority of identifiers seen in the Doc View will be all-lowercase. Mixed-case identifiers need no special handling — they are displayed verbatim like any other name.

The resulting visual language of a column row is therefore consistent with SQL convention: **identifiers and type names in lowercase** (as stored), **constraint chips in UPPERCASE** (`NOT NULL`, `PK`, `FK`, `UNIQUE`). A reader fluent in SQL will immediately recognise which tokens are structural and which are schema-defined.

---

## 2. Data Inventory

The items below are sourced from ddlapi's core types: `Table`, `Column`, `ColumnType`, `SchemaType`, `Index`, `ForeignKey`, and `Attr`.

### 2.1 Table


| Data item         | ddlapi source                              | Doc View similarity                                | Notes                                                                                                                                                                            |
| ----------------- | ------------------------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Table name        | `Table.name`                               | Similar to **object property name** in JSON schema | Root node label                                                                                                                                                                  |
| Schema name       | Parent `Schema.name` of the table          | **Unique — requires special rendering**            | Shown as a `[schema_name]` chip to the left of the comment in the header row. Provides namespace context; most schemas are `public` so the chip is usually unambiguous and short |
| Table description | `Table.attrs` → `kind: 'Comment'`, `.text` | **Identical to `description`** in JSON schema      | Rendered as annotation row below the header, same component                                                                                                                      |


---

### 2.2 Columns

Each item in `Table.columns: Column[]`.

#### Always shown


| Data item               | ddlapi source                                                                                                                                                                                                                                                  | Doc View similarity                                                                             | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Column name             | `Column.name`                                                                                                                                                                                                                                                  | **Identical to property name** in JSON schema                                                   | Rendered as node title                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Column type             | `Column.type.type` — the `type` field of each `SchemaType` kind (e.g. `"varchar"`, `"int"`, `"timestamp"`); fall back to `ColumnType.raw` when `type` is absent (e.g. for `UnknownType`)                                                                       | **Identical to `type`** in JSON schema                                                          | Rendered in the type label next to the name; uses the base type name, not the kind enum. Type parameters are shown as separate constraint rows below                                                                                                                                                                                                                                                                                                                                                                         |
| Nullability             | `Column.type.null` — `false` = NOT NULL, `true` = explicitly NULL, `undefined` = not declared (implicitly nullable)                                                                                                                                            | **Consistent in principle, inverted direction** vs JSON schema                                  | Nullable is the SQL default and is not shown. When NOT NULL (`null: false`): show a `NOT NULL` chip in the header row. The chip is omitted when the `PK` chip is already present, since PK columns are implicitly NOT NULL — showing both would be redundant. Both JSON schema and the DB Doc View follow the same principle — show deviation from default — but the defaults are inverted: JSON schema defaults to not-nullable and marks `nullable: true` with `?`; SQL defaults to nullable and marks NOT NULL explicitly |
| Default value           | `Column.default: Expr` — `Literal.value` (e.g. `'active'`, `0`) or `RawExpr.expr` (e.g. `current_timestamp()`, `uuid()`)                                                                                                                                       | **Identical to `default`** in JSON schema                                                       | Rendered as an annotation row. Raw expressions shown verbatim (no quoting)                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Column description      | `Column.attrs` → `kind: 'Comment'`, `.text`                                                                                                                                                                                                                    | **Identical to `description`** in JSON schema                                                   | Same annotation row component as JSON schema description                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| PK membership           | Derived: check if column appears in `Table.primaryKey.parts[*]`                                                                                                                                                                                                | **Unique — requires special rendering**                                                         | `PK` chip in the header row. Composite PKs: multiple columns each carry the chip. No JSON schema equivalent                                                                                                                                                                                                                                                                                                                                                                                                                  |
| FK reference            | Derived: check if column appears in any `Table.foreignKeys[*].columns`; read `.refTable.name`, `.refColumns[*].name`, and the referenced table's schema (resolved by traversing `Realm.schemas` — `Table` has no direct back-reference to its parent `Schema`) | **Unique — requires special rendering**                                                         | `FK` chip in the header row, followed by a link that navigates to the referenced table definition. Link label is `refTable(refColumn)` when the referenced table is in the same schema as the current table; `refSchema.refTable(refColumn)` when in a different schema. For composite FKs, each participating column carries the chip with its own corresponding link                                                                                                                                                       |
| Unique-index membership | Derived: find `Table.indexes` where `index.unique === true` and column appears in `index.parts`                                                                                                                                                                | **Unique — requires special rendering**                                                         | `UNIQUE` chip in the header row. For composite unique indexes, columns participating in the same index share a chip. No JSON schema equivalent                                                                                                                                                                                                                                                                                                                                                                               |
| Generated column        | `Column.attrs` → `kind: 'GeneratedExpr'`; `.expr: string` (SQL expression); `.type?: string` (`'STORED'` in PostgreSQL — `VIRTUAL` is MySQL-specific and out of scope)                                                                                         | **Consistent** — similar to `readOnly` in JSON schema; the column cannot be written to directly | `GENERATED` chip in the header row. The expression is shown as an `as:` annotation row below the header, parallel to `default:`. Mutually exclusive with `default:` — a generated column has no default. Does **not** suppress `NOT NULL` (unlike `PK`)                                                                                                                                                                                                                                                                      |


#### Type-specific constraints (shown when present)

These render in a validations section below the header row, analogous to the Validations component in the JSON schema viewer.


| Data item                                    | ddlapi source                                                  | Doc View similarity                                                                                                 |
| -------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Enum values *(dialect-specific: PostgreSQL)* | `EnumType.values: string[]`                                    | **Identical to `enum`** in JSON schema — same list rendering                                                        |
| String max length                            | `StringType.size: number`                                      | **Identical to `maxLength`** in JSON schema — same constraint row                                                   |
| Decimal precision + scale                    | `DecimalType.precision?: number`, `DecimalType.scale?: number` | **Similar to number format constraints** — rendered as two separate constraint rows: `precision: 10` and `scale: 2` |
| Time / timestamp precision                   | `TimeType.precision?: number`                                  | **Similar to number format constraints** — fractional seconds precision, same constraint row style                  |


**User-defined types (non-enum):** For PostgreSQL UDTs not covered above — Composite Types, Domain Types, and Range Types — the column type label shows the UDT name from `Column.type.type.type` (or `ColumnType.raw` as fallback). No additional constraint rows are rendered. Detailed rendering for these types is deferred; see §2.5.

---

### 2.3 Indexes (non-PK)

From `Table.indexes` (not `Table.primaryKey`). Shown as a separate collapsible section after the columns list.


| Data item             | ddlapi source                  | Notes                                                                  |
| --------------------- | ------------------------------ | ---------------------------------------------------------------------- |
| Index name            | `Index.name` (if present)      | Used as the row label; indexes without a name are shown as `<unnamed>` |
| Participating columns | `Index.parts[*]` → column name | Shown as `(col1, col2)` tuple                                          |
| Unique flag           | `Index.unique: boolean`        | When true, show `UNIQUE` beside the index name                         |


**Unique to DB — no JSON schema equivalent.** Composite indexes are shown as a single row with all column names. Indexes that consist of a single column that already carries a `UNIQUE` chip on its column row are still listed here — the Indexes section is the canonical list of all indexes.

---

### 2.4 Foreign Keys

From `Table.foreignKeys`. Data used for the in-scope column chip rendering:


| Data item          | ddlapi source                                                                                                                           | Notes                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Source columns     | `ForeignKey.columns: Column[]`                                                                                                          | Identifies which columns carry the `FK` chip                                                       |
| Referenced table   | `ForeignKey.refTable.name`; schema resolved by traversing `Realm.schemas` (`Table` has no direct back-reference to its parent `Schema`) | Navigation target; schema prefix added to label when referenced table is in a different schema     |
| Referenced columns | `ForeignKey.refColumns: Column[]`                                                                                                       | Link label — `refTable(refColumn)` (same schema) or `refSchema.refTable(refColumn)` (cross-schema) |


The following FK data is available in ddlapi but only relevant for the separate FK section, which is out of scope for this version (see §2.5):


| Data item        | ddlapi source                           | Notes                                                         |
| ---------------- | --------------------------------------- | ------------------------------------------------------------- |
| Constraint name  | `ForeignKey.symbol?: string`            | May be absent                                                 |
| On delete action | `ForeignKey.onDelete?: ReferenceOption` | `CASCADE`, `SET NULL`, `RESTRICT`, `NO ACTION`, `SET DEFAULT` |
| On update action | `ForeignKey.onUpdate?: ReferenceOption` | Same enum                                                     |


---

### 2.5 Out of scope

The following ddlapi data is excluded from this Doc View version. Items marked *possible design* have a defined rendering candidate for when they are brought into scope.


| Item                                                                                                                                                          | Reason                                                                                                                                                                                                                    | Possible design                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Charset` / `Collation` attrs                                                                                                                                 | Dialect-specific, write/storage concern                                                                                                                                                                                   | —                                                                                                                                                                                                                                        |
| `Check` constraint attrs                                                                                                                                      | Write-side validation; not relevant for report building                                                                                                                                                                   | —                                                                                                                                                                                                                                        |
| `SpatialType` specific properties                                                                                                                             | Dialect-specific; the `t` field (raw type name) is still shown                                                                                                                                                            | —                                                                                                                                                                                                                                        |
| `UnknownType` / `UnknownAttr` details                                                                                                                         | Dialect-specific escape hatches. The type name is already shown via `Column.type.type.t` (or `ColumnType.raw` as fallback when `t` is absent); what is out of scope is interpreting any extra fields beyond the type name | —                                                                                                                                                                                                                                        |
| `NamedDefault` expr variant                                                                                                                                   | Dialect-specific (e.g. SQL Server sequences); `RawExpr` covers most cases                                                                                                                                                 | —                                                                                                                                                                                                                                        |
| `unsigned` on numeric types (`IntegerType`, `DecimalType`, `FloatType`)                                                                                       | MySQL / MariaDB only; not available in PostgreSQL                                                                                                                                                                         | `unsigned` prefix in the type label: `unsigned integer`, `unsigned decimal`                                                                                                                                                              |
| `FloatType.precision`                                                                                                                                         | MySQL / MariaDB-specific `FLOAT(M,D)` syntax (deprecated in MySQL 8.0.17); not present in PostgreSQL                                                                                                                      | Constraint row `precision: N`, same style as `DecimalType` precision                                                                                                                                                                     |
| `BinaryType.size`                                                                                                                                             | PostgreSQL's `bytea` has no size parameter; `BINARY(n)` / `VARBINARY(n)` with explicit size are MySQL / MariaDB types                                                                                                     | Constraint row `size: N`, same component as `StringType.size` / `maxLength`                                                                                                                                                              |
| Foreign Keys section                                                                                                                                          | A dedicated collapsible section listing all FK constraints with full details — analogous to the Indexes section                                                                                                           | Each FK row shows constraint name (if present), source column(s), referenced table and column(s), and ON DELETE / ON UPDATE actions                                                                                                      |
| Composite Type — `Column.type.type.kind === 'CompositeType'` (`PgObjectKind`); exposes `name: string`, `schema: string`, `fields: Column[]`                   | PostgreSQL UDT; column holds a structured record value. UDT name shown in type label as fallback                                                                                                                          | Render as a hierarchical tree of the composite's named fields and their types, analogous to a nested JSON schema object                                                                                                                  |
| Domain Type — `Column.type.type.kind === 'Domain'` (`PgTypeKind`); exposes `type: string` (domain name) and `baseType: SchemaType` (resolved underlying type) | PostgreSQL UDT; named alias over a base type with optional constraints. UDT name shown in type label as fallback                                                                                                          | Render as the base type with the domain name as a qualifier in `<>` brackets, e.g. base type `text` with domain `email_address` shown as `text <email_address>`                                                                          |
| Range Type — `Column.type.type.kind === 'RangeType'` (`PgObjectKind`); exposes `name: string`, `schema: string`, `subtype?: string` (element type name)       | PostgreSQL UDT; represents a contiguous range of a subtype. UDT name shown in type label as fallback                                                                                                                      | Render as `range<subtype>`, e.g. `range<date>`, `range<integer>`, `range<timestamp with time zone>` — base type `range` with the element type as qualifier, consistent with `string<date-time>` and `object<NameRefType>` in JSON schema |


---

## 3. Doc View Tree Structure

### 3.1 Table node (root)

```
┌─────────────────────────────────────────────────────────────────┐
│  orders                                                         │
│  [public]  Customer orders placed through the storefront.       │  ← schema chip + comment
└─────────────────────────────────────────────────────────────────┘
```

The table node is the root. Its header shows the table name. The second line shows the schema name as a `[schema_name]` chip followed by the table comment, if present. When there is no comment, the schema chip appears alone on the second line. The comment renders using the same component as JSON schema `description`.

---

### 3.2 Column nodes

Column nodes are children of the table root. Each row follows the same layout as a JSON schema property node:

```
  name           type              [NOT NULL | PK]  [UNIQUE]  FK [refSchema.]refTable(refColumn)
    description text...                               ← annotation (if comment present)
    default: value                                    ← annotation (if default present)
    <constraint rows>                                 ← validations (type-specific)
```

**Full example — the `orders` table:**

```
  id             integer                       PK
  customer_id    integer                       FK  customers(id)  ← link opens customers table
  status         order_status      NOT NULL              ← null:false
    values: pending, shipped, delivered                  ← enum values (like JSON schema enum)
  total          decimal                                 ← nullable (null:true or undefined), not shown
    precision: 10
    scale: 2
  note           varchar
    size: 1000
  created_at     timestamp         NOT NULL
    default: current_timestamp()
  thumbnail      bytea                                   ← PostgreSQL binary
  order_ref      text              GENERATED             ← computed; cannot be written to
    as: 'ORD-' || id::text
```

**Rendering rules:**

- **Type label**: Shows `Column.type.type.type` — the base DDL type name (e.g. `varchar`, `decimal`, `timestamp`, `bytea`). Falls back to `ColumnType.raw` when `type` is absent. Same visual component as JSON schema type label.
- **Chips**

  | Chip        | Color                                                                                                                 | Rendering rules                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
  | ----------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `NOT NULL`  | muted rose — signals a required/mandatory constraint without the alarm of a hard error red.                           | Appears when `Column.type.null === false`. Nullable is the SQL default and is not marked. Omitted when the `PK` chip is present — PK columns are implicitly NOT NULL, so showing both would be redundant. This follows the same "show deviation from default" principle as JSON schema (which marks `nullable: true` with `?`), but in the opposite direction since SQL defaults to nullable.                                                                                                                                                                                                                                                                                                                                                                                   |
  | `PK`        | amber/gold — universal "primary key" convention across database tooling; visually distinguished from all other chips. | Distinct chip; no JSON schema equivalent.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
  | `FK` + link | blue — reinforces the navigation/link affordance of the trailing link label                                           | `FK` chip in the header row, immediately followed by a link that navigates to the referenced table's definition. The link label is `refTable(refColumn)` when the referenced table is in the same schema as the current table, or `refSchema.refTable(refColumn)` when in a different schema — the schema prefix is only added when necessary to disambiguate. The referenced table's schema is determined by traversing `Realm.schemas`, since `Table` has no direct back-reference to its parent `Schema`. For composite FKs, each participating column shows the chip with its own corresponding link. The `FK` chip and its link must always appear last among the header chips, since the trailing link label would break the visual grouping of any chips that follow it. |
  | `UNIQUE`    | violet — structural value constraint, distinct from both the FK blue and the PK amber.                                | Distinct chip; no JSON schema equivalent.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

- **Constraint rows**: Rendered under the header using the same Validations component rows as JSON schema. Each constraint type maps to a labelled row:
  - `values: ...` for enum *(dialect-specific: PostgreSQL)* — same as JSON schema `enum`
  - `size: N` for string max length (same component as `maxLength`)
  - `precision: N` for decimal precision
  - `scale: N` for decimal scale
  - `precision: N` for timestamp fractional seconds
  - `default: ...` for default values
- `**GENERATED` chip**: Appears when `Column.attrs` contains `kind: 'GeneratedExpr'`. Signals that the column is computed by the database and cannot be written to directly — analogous to `readOnly` in JSON schema. The generating expression (`attr.expr`) is shown as an `as:` annotation row directly below the header, parallel to `default:`. A generated column cannot have a `default:` row — the two are mutually exclusive. The `GENERATED` chip does **not** suppress the `NOT NULL` chip — unlike `PK`, being generated does not imply nullability. Colour: gray — read-only / passive; mirrors the conventional styling of disabled or non-writable UI elements.
- **Description**: When a column has a Comment attr, renders below the header as an annotation row — same component as JSON schema `description`.

---

### 3.3 Indexes section

Rendered as a collapsible section node after all column nodes. No JSON schema equivalent.

```
  ▼ Indexes
      idx_customer_date      (customer_id, created_at)
      idx_status             (status)           UNIQUE
```

Each index is a non-expandable row showing:

- Index name, or `<unnamed>` for indexes without a name
- Column tuple in parentheses
- `UNIQUE` chip when `index.unique === true`

A single-column unique index whose column already carries a `UNIQUE` chip is still listed here — the Indexes section is the authoritative list.

---

### 3.4 Foreign Keys section (out of scope)

A dedicated collapsible section listing all FK constraints with constraint name, source/target columns, and ON DELETE / ON UPDATE actions — analogous to the Indexes section — is out of scope for this version. See §2.5 for the possible design and §2.4 for the available ddlapi data.

---

## 4. Rendering Similarity Matrix


| DB concept                                       | JSON schema analog                    | Rendering decision                                                                                                                                                                           |
| ------------------------------------------------ | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Table comment                                    | `description`                         | **Identical** — same annotation component                                                                                                                                                    |
| Schema name chip                                 | *(none)*                              | **Unique** — `[schema]` chip on the header line, left of the comment                                                                                                                         |
| Column name                                      | Property name                         | **Identical** — same NodeTitle component                                                                                                                                                     |
| Column type (`type` field, fallback `raw`)       | `type`                                | **Identical** — same NodeType label                                                                                                                                                          |
| NOT NULL (`null: false`)                         | `nullable: false` (default, unmarked) | **Consistent in principle, inverted direction** — SQL defaults to nullable so NOT NULL is the marked case; shown as `NOT NULL` chip (muted rose)                                             |
| Default value                                    | `default`                             | **Identical** — same annotation row                                                                                                                                                          |
| Column comment                                   | `description`                         | **Identical** — same annotation row                                                                                                                                                          |
| EnumType values *(dialect-specific: PostgreSQL)* | `enum`                                | **Identical** — same Validations list row                                                                                                                                                    |
| StringType `size`                                | `maxLength`                           | **Consistent** — same Validations component, label reads "size"                                                                                                                              |
| DecimalType `precision` / `scale`                | `minimum` / `maximum`                 | **Consistent** — same Validations row style                                                                                                                                                  |
| Time `precision`                                 | number format constraints             | **Consistent** — same Validations row style                                                                                                                                                  |
| `GENERATED` chip + `as:` expression              | `readOnly: true` in JSON schema       | **Consistent** — `GENERATED` chip mirrors the `readOnly` tag; expression rendered as `as:` annotation row, same component as `default:`                                                      |
| `PK` chip                                        | *(none)*                              | **Unique** — special chip, amber/gold colour                                                                                                                                                 |
| `FK` chip + link                                 | `$ref` type label                     | **Unique** — `FK` chip on the column header followed by a `refTable(refColumn)` link (or `refSchema.refTable(refColumn)` for cross-schema references) that navigates to the referenced table |
| `UNIQUE` chip                                    | *(none)*                              | **Unique** — special chip                                                                                                                                                                    |
| Indexes section                                  | *(none)*                              | **Unique** — collapsible section node after columns; unnamed indexes shown as `<unnamed>`                                                                                                    |


---

## 5. Design Decisions

Key decisions made during the design process, with the alternatives considered. Recorded so that the rationale is not lost when revisiting the design.

---

### 5.1 FK display: chip + link on column

**Decision:** `FK` chip on each source column, immediately followed by a `table(column)` link that navigates to the referenced table. A dedicated Foreign Keys section (listing all FK constraints with ON DELETE / ON UPDATE details) is deferred to a future version.

**Alternatives considered:**

- *Dedicated FK section only* — more complete (constraint name, ON DELETE / ON UPDATE, composite FK grouping), but adds a whole new section for what is often a simple one-column reference.
- *Expandable column node* — FK column expands to show referenced table's columns inline, analogous to `$ref` in JSON schema. Most powerful; deferred due to implementation cost.

**Rationale:** The chip + link covers the dominant case (single-column FK to an `id` column) with minimal visual weight. The separate section is kept as a future enhancement, not discarded — its data is already catalogued in §2.4.

---

### 5.2 FK link label: `table(column)` syntax

**Decision:** The link label uses `table(column)` notation — e.g. `customers(id)` — mirroring SQL's own `REFERENCES customers(id)` syntax. For cross-schema references, `schema.table(column)` is used; the schema prefix is omitted when the referenced table is in the same schema as the current table.

**Alternatives considered:**

- `table.column` — dot-separated qualified name, familiar as a property path but visually indistinguishable between table and column segments.
- Always show the schema prefix — unambiguous but adds noise in the typical same-schema case.

**Rationale:** `table(column)` directly mirrors the SQL syntax every report builder already reads in DDL. No translation needed.

---

### 5.3 Nullability: NOT NULL chip, nullable silent

**Decision:** Nullable columns (the SQL default) show nothing. Explicitly NOT NULL columns show a `NOT NULL` chip. The `NOT NULL` chip is suppressed when the `PK` chip is present, since PK columns are implicitly NOT NULL.

**Alternatives considered:**

- Show `?` for nullable (mirroring JSON schema's `nullable: true` → `?`) — consistent with JSON schema visually, but since nullable is the SQL default, marking it would add noise to most columns.

**Rationale:** Both approaches follow the same principle — mark the deviation from the type system's default — but the defaults are inverted. SQL defaults to nullable, so NOT NULL is the notable case. The visual result (`NOT NULL` chip vs no marker) is different from JSON schema, but the underlying principle is the same.

---

### 5.4 FK chip position: always last

**Decision:** The `FK` chip and its trailing link label must always appear last in the column header chip sequence.

**Alternatives considered:**

- Fixed position regardless of other chips — e.g. `NOT NULL | PK   FK link   UNIQUE`. The link label would then sit between chips, visually breaking the chip group.

**Rationale:** The link label appended after `FK` is freeform text, not a chip. Placing it in the middle of the chip row would disrupt the visual grouping of chips that follow it.

---

### 5.5 Non-unique index participation: not annotated on columns

**Decision:** Columns that participate in non-unique indexes do not receive any chip or annotation on the column row. Index membership is visible only in the Indexes section.

**Alternatives considered:**

- `IDX` chip on participating columns — makes index coverage scannable without scrolling to the Indexes section, but adds visual noise across many columns for information that is a performance hint rather than a data constraint.

**Rationale:** `PK` and `UNIQUE` are structural data constraints (they affect what values are valid). A non-unique index is a performance hint with no effect on the data model. The Indexes section already provides the complete picture. The cross-reference interaction (highlight a column when hovering its index entry) is noted as a future enhancement that achieves the same scanability goal without permanent visual noise.

---

### 5.6 Index rows: not expandable

**Decision:** Index rows in the Indexes section are flat, non-expandable rows showing index name, column tuple, and UNIQUE flag.

**Alternatives considered:**

- Expandable rows showing column type definitions inline — useful for wide tables where the indexed column is far from the Indexes section, but redundant since all column definitions are already visible on the same page.

**Rationale:** The typical table (5–30 columns) makes scrolling trivial. The information is not elsewhere; it is above. The hover cross-reference interaction is the right mechanism for the wide-table case and can be added later without structural changes.

---

### 5.7 Type parameters: `t` in label + separate constraint rows

**Decision:** The type label shows `Column.type.type.t` — the base type name (e.g. `varchar`, `decimal`, `timestamp`). Type parameters are rendered as separate constraint rows below the header (`size: 100`, `precision: 10`, `scale: 2`, `precision: 3`).

**Alternatives considered:**

- `ColumnType.raw` in the label (e.g. `varchar(100)`) — more SQL-idiomatic and compact; no separate constraint rows needed for type parameters. Considered and initially adopted, then reversed.

**Rationale:** Separating the base type from its parameters is consistent with JSON schema's rendering (`"type": "string"` + `"maxLength": 100`), keeps the constraint rows as the canonical place for parameter details, and allows each parameter to be compared directly to its JSON schema equivalent.

---

### 5.8 Dialect scope: SQL core + PostgreSQL

**Decision:** The design covers SQL core types and PostgreSQL-specific features. MySQL / MariaDB-specific features are documented in §2.5 (Out of scope) with possible designs, but are not rendered in the current version.

**Key items excluded:** `unsigned` on numeric types, `FloatType.precision` (`FLOAT(M,D)`), `BinaryType.size` (MySQL's `BINARY(n)` / `VARBINARY(n)`), `VIRTUAL` generated columns.

**Rationale:** The primary target audience (Apache Superset report builders) work most commonly against PostgreSQL. MySQL / MariaDB features are catalogued rather than deleted so they can be brought in scope without revisiting the design from scratch.

---

## 6. Cases for Mockup Preparation

Each case covers one or more distinct rendering elements. Together they cover every visual element defined in this document. Each SQL sample is minimal and self-sufficient. Cases marked **JSON schema** include a minimal JSON schema snippet showing the equivalent rendered elements.

---

### 6.1 Table header

Covers: schema chip, table name, table description.

**Rendering**

```
┌─────────────────────────────────────────────────────────────────┐
│  sales_summary                                                  │
│  [reporting]  Monthly sales aggregated by region.               │
└─────────────────────────────────────────────────────────────────┘
  id             integer
```

**SQL**

```sql
CREATE SCHEMA reporting;

CREATE TABLE reporting.sales_summary (
    id  integer
);

COMMENT ON TABLE reporting.sales_summary
    IS 'Monthly sales aggregated by region.';
```

**JSON schema** — `description` renders identically

```json
{
  "type": "object",
  "description": "Monthly sales aggregated by region."
}
```

---

### 6.2 Nullability and primary key

Covers: PK chip, NOT NULL chip on a non-PK column, nullable column (nothing shown), NOT NULL suppression when PK is present.

**Rendering**

```
┌─────────────────────────────────────────────────────────────────┐
│  orders                                                         │
│  [public]                                                       │
└─────────────────────────────────────────────────────────────────┘
  id             integer           PK
  placed_at      timestamp         NOT NULL
  note           text
```

**SQL**

```sql
CREATE TABLE orders (
    id         integer    PRIMARY KEY,
    placed_at  timestamp  NOT NULL,
    note       text
);
```

*No JSON schema — the rendering principle (show the deviation from the type system's default) is the same, but the direction is inverted: JSON schema marks `nullable: true` with `?`; the Doc View marks NOT NULL with a chip, since nullable is the SQL default.*

---

### 6.3 Foreign keys

Covers: FK chip, same-schema link label `table(column)`, cross-schema link label `schema.table(column)`.

**Rendering**

```
┌─────────────────────────────────────────────────────────────────┐
│  orders                                                         │
│  [public]                                                       │
└─────────────────────────────────────────────────────────────────┘
  customer_id    integer                    FK  customers(id)
  currency_id    integer                    FK  finance.currencies(id)
```

**SQL**

```sql
CREATE SCHEMA finance;

CREATE TABLE customers (
    id  integer  PRIMARY KEY
);

CREATE TABLE finance.currencies (
    id  integer  PRIMARY KEY
);

CREATE TABLE orders (
    customer_id  integer  REFERENCES customers(id),
    currency_id  integer  REFERENCES finance.currencies(id)
);
```

---

### 6.4 Unique constraint

Covers: UNIQUE chip.

**Rendering**

```
┌─────────────────────────────────────────────────────────────────┐
│  users                                                          │
│  [public]                                                       │
└─────────────────────────────────────────────────────────────────┘
  id             integer           PK
  email          text              NOT NULL   UNIQUE
```

**SQL**

```sql
CREATE TABLE users (
    id     integer  PRIMARY KEY,
    email  text     NOT NULL
);

CREATE UNIQUE INDEX uq_users_email ON users (email);
```

---

### 6.5 Generated column

Covers: GENERATED chip, `as:` annotation row.

**Rendering**

```
┌─────────────────────────────────────────────────────────────────┐
│  employees                                                      │
│  [public]                                                       │
└─────────────────────────────────────────────────────────────────┘
  first_name     text              NOT NULL
  last_name      text              NOT NULL
  full_name      text              GENERATED
    as: first_name || ' ' || last_name
```

**SQL**

```sql
CREATE TABLE employees (
    first_name  text  NOT NULL,
    last_name   text  NOT NULL,
    full_name   text  GENERATED ALWAYS AS
                          (first_name || ' ' || last_name) STORED
);
```

**JSON schema** — `readOnly: true` renders similarly as a tag on the property row

```json
{
  "type": "object",
  "properties": {
    "full_name": {
      "type": "string",
      "readOnly": true
    }
  }
}
```

---

### 6.6 Enum type

Covers: enum type name in the type label, `values:` constraint row.

**Rendering**

```
┌─────────────────────────────────────────────────────────────────┐
│  orders                                                         │
│  [public]                                                       │
└─────────────────────────────────────────────────────────────────┘
  id             integer           PK
  status         order_status      NOT NULL
    values: pending, shipped, delivered
```

**SQL**

```sql
CREATE TYPE order_status AS ENUM ('pending', 'shipped', 'delivered');

CREATE TABLE orders (
    id      integer       PRIMARY KEY,
    status  order_status  NOT NULL
);
```

**JSON schema** — `enum` renders identically as a constraint list

```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["pending", "shipped", "delivered"]
    }
  },
  "required": ["status"]
}
```

---

### 6.7 Type constraints

Covers: `size:` constraint row for `varchar(n)`, `precision: N` and `scale: N` constraint rows for `decimal`, `precision: N` constraint row for `timestamp(n)`.

**Rendering**

```
┌─────────────────────────────────────────────────────────────────┐
│  products                                                       │
│  [public]                                                       │
└─────────────────────────────────────────────────────────────────┘
  name           varchar           NOT NULL
    size: 100
  price          decimal           NOT NULL
    precision: 10
    scale: 2
  updated_at     timestamp
    precision: 3
```

**SQL**

```sql
CREATE TABLE products (
    name        varchar(100)   NOT NULL,
    price       decimal(10,2)  NOT NULL,
    updated_at  timestamp(3)
);
```

**JSON schema** — `maxLength` and `minimum`/`maximum` render as equivalent constraint rows; no direct analog for timestamp precision

```json
{
  "type": "object",
  "properties": {
    "name":  { "type": "string", "maxLength": 100 },
    "price": { "type": "number", "minimum": 0, "maximum": 9999999.99 }
  },
  "required": ["name", "price"]
}
```

---

### 6.8 Annotation rows

Covers: table description, `default:` with a literal value, `default:` with a function expression, column description. Every entity that can carry a comment in the Doc View (table and column) is present.

**Rendering**

```
┌─────────────────────────────────────────────────────────────────┐
│  events                                                         │
│  [public]  Calendar events tracked by the system.               │
└─────────────────────────────────────────────────────────────────┘
  id             integer           PK
  status         text              NOT NULL
    default: 'scheduled'
  created_at     timestamp         NOT NULL
    default: current_timestamp
  description    text
    Optional free-text notes about the event.
```

**SQL**

```sql
CREATE TABLE events (
    id          integer    PRIMARY KEY,
    status      text       NOT NULL DEFAULT 'scheduled',
    created_at  timestamp  NOT NULL DEFAULT current_timestamp,
    description text
);

COMMENT ON TABLE events
    IS 'Calendar events tracked by the system.';

COMMENT ON COLUMN events.description
    IS 'Optional free-text notes about the event.';
```

**JSON schema** — `description` (table and property) and `default` render identically

```json
{
  "type": "object",
  "description": "Calendar events tracked by the system.",
  "properties": {
    "status": {
      "type": "string",
      "default": "scheduled"
    },
    "description": {
      "type": "string",
      "description": "Optional free-text notes about the event."
    }
  }
}
```

---

### 6.9 Indexes section

Covers: non-unique single-column index, non-unique composite index, unique index, unnamed index.

**Rendering**

```
┌─────────────────────────────────────────────────────────────────┐
│  orders                                                         │
│  [public]                                                       │
└─────────────────────────────────────────────────────────────────┘
  id             integer           PK
  customer_id    integer           NOT NULL
  status         text              NOT NULL
  total          decimal

  ▼ Indexes
      idx_orders_customer          (customer_id)
      idx_orders_cust_status       (customer_id, status)
      uq_orders_ref                (customer_id, status)   UNIQUE
      <unnamed>                    (total)
```

**SQL**

```sql
CREATE TABLE orders (
    id           integer  PRIMARY KEY,
    customer_id  integer  NOT NULL,
    status       text     NOT NULL,
    total        decimal
);

CREATE INDEX idx_orders_customer
    ON orders (customer_id);

CREATE INDEX idx_orders_cust_status
    ON orders (customer_id, status);

CREATE UNIQUE INDEX uq_orders_ref
    ON orders (customer_id, status);

CREATE INDEX ON orders (total);
```

