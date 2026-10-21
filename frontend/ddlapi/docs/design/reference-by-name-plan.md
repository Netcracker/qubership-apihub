# ddlapi: reference foreign key targets by name

Sep 25, 2026 · @Alexey

## Summary

Change `ForeignKey.refTable` from a `Table` object to a `{ schema, name }` reference, and every column reference to a
column name: `ForeignKey.refColumns`, `ForeignKey.columns`, and `IndexPart.column`. No consumer in the apihub stack
navigates from a key or an index part into the column or table it names, and the object references cost special cases in
every component.

**Decision requested:** approve a major ddlapi release (1.0.0 → 2.0.0) that changes all four fields together, so that
references within a table and across tables are handled the same way.

## Background

The parser already holds foreign key targets as names and converts them to objects in a second pass. `createTable.ts`
records `refTableKey` (`"schema.table"`) and `refColumnNames`; `referenceResolver.ts` step 4 looks both up and assigns
the shared `Table` and `Column` instances. An unresolved target leaves `refTable` and `refColumns` undefined.

The object shape comes from the ddlapi model being a port of Atlas Go, where `ForeignKey.RefTable` is `*Table` and
`RefColumns` is `[]*Column`. The base-model plan calls these references opaque: the library does not check that
`refColumns` belong to `refTable`.

Every current reader uses only the target's names:

| Component | What it reads | How it finds the target's schema |
| --- | --- | --- |
| api-doc-viewer (`ddlapi-spec-transformer.ts`) | `refTable.name`, `refColumns[j].name` | Identity scan of the realm, then a unique table-name match, then the owning table's schema |
| api-diff (`ddl.description.ts`) | `refTable.name`, `refColumns[*].name` | Identity scan of the realm (`schemaNameOfTableNode`) |
| api-unifier (`unifies/ddlapi.ts`) | Whether `refTable` is an object (dangling-key report) | Not needed |

None of them reads the target's columns, types, or indexes through the key.

## Problems with object references

Each finding below was measured against ddlapi 1.0.0, api-unifier 2.9.2, and api-diff on
`feature/compatibility-suites-for-ddl`.

**api-unifier must special-case the edges to keep one merged object per table.** `define-ddlapi-origins.ts` walks the
realm twice so that a referenced table is homed at its `CREATE TABLE`, and `isReferenceObjectChild` /
`isReferenceArrayChild` exclude `refTable` and `refColumns` from the first pass. api-diff keys its merged-node cache on
declaration paths, so this homing is required: when the `refTable` slot was originated at the key instead, table `t` was
built twice in the merged document and a shared column lost its diff metadata (two shared-instance tests failed).

**The same homing puts `refTable` diffs in the wrong place.** Because the slot's origin is the target table, the
`change-referenced-table` diff declares at `schemas.0.tables.0.name` and `schemas.0.tables.1.name`, the two referenced
tables, instead of at `schemas.0.tables.2.foreignKeys.0.refTable`. To describe it, api-diff resolves the key from the
crawl route rather than from the declaration path.

**api-diff needs a dedicated rule to avoid re-diffing the target.** `foreignKeyRefTableRules` suppresses eight
properties of the referenced table key by key, because a nested `/**` suppression also hides `/name`. Without it, a
change inside a table would be reported again under every key that references it.

**Both consumers search for the target's schema.** The `Table` object has no back-reference to its schema, so api-diff
and the viewer scan the realm by identity. The viewer's last fallback, the owning table's schema, is wrong when two
schemas contain tables with the same name and the target is absent from the realm.

## Proposal

`refTable` becomes a `TableRef`, the type ddlapi already exports from `extractTableDdl.ts`. Every column reference
becomes a column name, whether it points into the same table (`ForeignKey.columns`, `IndexPart.column`) or into another
one (`ForeignKey.refColumns`):

```typescript
export interface TableRef {
  schema: string
  name: string
}

export interface ForeignKey {
  kind: typeof ObjectKind.ForeignKey
  symbol?: string
  columns?: string[]      // was Column[]
  refTable?: TableRef     // was Table
  refColumns?: string[]   // was Column[]
  onUpdate?: ReferenceOption
  onDelete?: ReferenceOption
  attrs?: Attr[]
}

export interface IndexPart {
  seqNo: number
  desc?: boolean
  expr?: Expr
  column?: string         // was Column
  attrs?: Attr[]
}
```

A bare string such as `refTable: 'users'` is not enough, because two schemas can each contain a table with that name.
Column names need no qualifier, since they are unique within a table.

`schema` is always set, including for the default schema. Consumers that omit the default schema in output, as api-diff
descriptions do, drop it when rendering.

A key whose target is not in the DDL keeps its names. ddlapi still reports `unresolved-reference`, but the realm now
records which table and columns the key named, where today both fields are left undefined.

The same applies to an index part whose column is not in the table: the part keeps the column name, where today
`referenceResolver.ts` step 5 leaves `column` undefined without reporting it.

References stay opaque, as the base-model plan states: api-unifier does not check that the referenced columns exist in
the referenced table.

Names belong to the key or index part that holds them, so api-unifier homes each one at its own slot with no special
case, and a repointed key declares its diff at `…foreignKeys.[fk].refTable`. The only shared instances left in a realm
are named types (enum and domain), used by `ColumnType.type`.

A column's own changes, such as a type change, are then reported only under `table.columns`. Index parts and key column
lists no longer reach the column, so they carry no copy of its diff; the viewer reads column diffs from the table, so it
shows the same result.

## Impact by component

Most of the change is deletion: special cases that exist only because the target is an object go away in every
component except compatibility-suites, which is not affected.

| Component | Source changes | Tests to update |
| --- | --- | --- |
| ddlapi | `schema.ts` and `factories.ts`: new field types for `ForeignKey` and `IndexPart`. `createTable.ts` and `createIndex.ts`: store names when the key or index part is built. `referenceResolver.ts`: steps 4 and 5 keep their lookups only to report unresolved references. `build-from-ddl-plan.md`: unresolved keys and index parts keep their names. | Identity assertions in `buildFromDdl.test.ts`, `schema.test.ts`, `statements/createTable.test.ts` |
| api-unifier | `define-ddlapi-origins.ts`: `isReferenceArrayChild` goes away, and `isReferenceObjectChild` keeps only the named-type clause. `rules/ddlapi.ts`: replace the lazy `'/refTable': () => tableRules` edge with string validation of `schema` and `name`; `ForeignKey.columns`, `refColumns`, and `IndexPart.column` become string validation instead of `columnRules`. `unifies/ddlapi.ts`: `primaryKeyColumns` collects names instead of `Column` objects, so the primary-key nullability default matches by name. Remove `reportDanglingForeignKey` and the `ddlApiDanglingForeignKey` message in `errors.ts`: an unresolved key is reported only by ddlapi's `unresolved-reference`. | `references.test.ts` and `deunify.test.ts` (cyclic and index-part identity), `defaults.test.ts` (primary-key column identity), `origins.test.ts`, `e2e.test.ts`, `partial-realm.test.ts` (drop the `onUnifyError` case for a dangling key), `validate.test.ts` |
| api-diff | `ddl.rules.ts`: `foreignKeyRefTableRules` becomes a rule on two string fields; the key-columns compare resolver compares names; `indexPartRules` drops its `'/column': columnRules` edge. `ddl.mapping.ts`: `indexPartMappingResolver` keys on the name itself. `ddl.description.ts`: `partLabel`, `renderPartClause`, and the key's local and referenced clauses read names directly; remove `schemaNameOfTableNode` and `schemaOfTable`; the crawl route keeps one use, values materialized from defaults. | `ddl.merged.test.ts`: the two cases that reach a column through a primary key or a foreign key lose their subject; `change-referenced-table` expectations in `constraints.test.ts` and `ddl.description.test.ts` |
| api-doc-viewer | `next-data-model` `ddlapi-spec-transformer.ts`: `resolveForeignKeyTargetSchemaName`, `findSchemaNameForTable`, and `findUniqueSchemaNameForTableName` reduce to reading `refTable.schema`; `isSameForeignKeyColumn` and the index-part checks compare names directly instead of reading `column.name`. Field docs in `node-value.ts`. | Three target-resolution cases in `ddlapi-spec-transformer.test.ts`; realm fixtures in `bugs-samples.stories.tsx` |
| compatibility-suites | None; fixtures are SQL | None |

The viewer's diff rendering is unaffected: it reads foreign-key diffs at the whole-key level, index-part diffs at the
part level, and column diffs from `table.columns`, never through a reference.

## Costs and risks

The main cost is a breaking change to a published model; the main risk is a consumer outside these five repositories.

- **Atlas parity.** This is the first deliberate departure from the Atlas Go model, which the ddlapi README names as its
  source. Parity with Atlas has not been used for anything beyond the initial port, but the README and the base-model
  plan need to say where the models now differ.
- **Breaking release.** Every consumer pins ddlapi, api-unifier, and api-diff versions, so the change ships as
  coordinated major or minor releases (see Rollout).
- **Navigation through a reference.** Code that reads `fk.refTable.columns`, `fk.refColumns[0].type`, or
  `part.column.type` has to look the column or table up in the realm. The only such code in ddlapi, api-unifier,
  api-diff, and api-doc-viewer is api-unifier's primary-key nullability default, which switches to matching by name
  (see Impact). This proposal assumes that no consumer outside these repositories, such as the apihub backend or the
  builder, reads a realm through these fields.
- **Hand-built realms.** Callers of `newForeignKey`, `newPrimaryKey`, `newColumnPart`, and `newIndexPart` that pass
  `Table` or `Column` objects fail to compile after the upgrade, which is the intended signal. A hand-built key that
  names a missing table is no longer reported, since only the parser checks references.

## Rollout

The components release in dependency order, each consuming the previous one's new version.

| Order | Component | Release | Depends on |
| --- | --- | --- | --- |
| 1 | ddlapi | 2.0.0 (major: `ForeignKey` field types change) | None |
| 2 | api-unifier | Major: the normalized realm's `refTable` and `refColumns` change shape | ddlapi 2.0.0 |
| 3 | api-diff | Major or minor, per the team's policy: the merged document's shape and the `change-referenced-table` declaration path change | ddlapi 2.0.0, api-unifier from step 2 |
| 4 | api-doc-viewer | Minor: internal to `next-data-model` | api-diff from step 3 |

The DDL compatibility suite needs no release; api-diff's suite expectations change in step 3.
