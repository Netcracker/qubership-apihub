import { CrawlRulesContext } from '@netcracker/qubership-apihub-json-crawl'
import { createDiffEntry, diffFactory } from '../core'
import { CompareResolver } from '../types'
import { isArray, isObject } from '../utils'
import { allAnnotation, allNonBreaking, allUnclassified } from '../core'
import {
  CompareMode,
  CompareRule,
  CompareRules,
  IGNORE_ADD_REMOVE_RULE,
  IGNORE_DIFFERENCE_IN_KEYS_RULE,
  IGNORE_DIFFERENCE_RULE,
} from '../types'
import {
  AttrKind,
  DdlapiProperties,
  DdlApiSpecVersion,
  ExprKind,
  ObjectKind,
  TypeKind,
} from './ddl.const'
import { DdlDiffDialect } from './ddl.dialect'
import { readKind } from './ddl.utils'
import {
  columnClassifier,
  createTypeNameClassifier,
  enumValueClassifier,
  nullabilityClassifier,
  tableClassifier,
} from './ddl.classify'
import {
  attrsMappingResolver,
  enumValuesMappingResolver,
  indexMappingResolver,
  indexPartMappingResolver,
  nameMappingResolver,
  foreignKeyMappingResolver,
} from './ddl.mapping'
import {
  checkDescription,
  columnDescription,
  columnFacetDescription,
  commentDescription,
  createAttrMemberParamsCalculator,
  createColumnParamsCalculator,
  createEnumTypeParamsCalculator,
  createEnumValueParamsCalculator,
  createForeignKeyParamsCalculator,
  createIndexParamsCalculator,
  createTableParamsCalculator,
  enumTypeDescription,
  enumValueDescription,
  foreignKeyDescription,
  indexDescription,
  tableDescription,
} from './ddl.description'

export interface DdlRulesOptions {
  mode: CompareMode
  version: DdlApiSpecVersion
}

// `kind` is a technical discriminant with no domain meaning, and `column.type.raw` is
// redundant with `column.type.type` — both are suppressed in place
// (whole node, all actions) so an end user never sees "changed kind/raw from X to Y".
const SUPPRESS: CompareRule = { [IGNORE_DIFFERENCE_RULE]: true }

// Decorates a rule object for use as an element of an identity-keyed array. ddlapi arrays are
// keyed by logical identity, so a resolver may match an element to a *different* index; without
// this the engine would report that index change as a `[Renamed]` diff. `ignoreKeyDifference`
// on the element suppresses it.
//
// It returns a shallow copy carrying the flag rather than setting it on the rule object directly,
// because the same rule object (indexRules) is reused both as a keyed-array element *and* as the
// plain single edge `/primaryKey`, where the flag is meaningless. Keeping it a per-use-site copy leaves the shared
// base object clean for those other uses. (An element rule that is defined inline and used once —
// e.g. enum `/values/*` — just sets the flag directly; this wrapper is for the shared, reused
// rules so the spread is not hand-repeated at every mapped `/*`.)
const asElement = (rules: CompareRules): CompareRules => ({
  ...rules,
  [IGNORE_DIFFERENCE_IN_KEYS_RULE]: true,
})

/**
 * Core, driver-neutral ddlapi diff rules. Mirrors api-unifier's `ddlApiRules` shape
 * (Realm → schemas → tables → columns/indexes/foreignKeys/attrs/objects) so the two
 * libraries stay aligned. Union `kind`s the core does not recognise are delegated to
 * `dialect.*RulesFor(kind)`; a dialect miss falls back to the single root-level
 * `unclassified` catch-all (`/**` → `$: allUnclassified`).
 *
 * All node rules are declared inside this closure so they capture `dialect`; the union
 * dispatchers are resolved lazily at crawl time.
 */
export const ddlRules = (_options: DdlRulesOptions, dialect: DdlDiffDialect): CompareRules => {
  const typeNameClassifier = createTypeNameClassifier(dialect)
  // One scoped descriptionParamCalculator per family, attached at the subtree node that owns it;
  // `diffDescription` resolves the nearest one up the rule tree for each rendered description.
  const tableParams = createTableParamsCalculator(dialect)
  const columnParams = createColumnParamsCalculator(dialect)
  const indexParams = createIndexParamsCalculator(dialect)
  const foreignKeyParams = createForeignKeyParamsCalculator(dialect)
  const attrMemberParams = createAttrMemberParamsCalculator(dialect)
  const enumTypeParams = createEnumTypeParamsCalculator(dialect)
  const enumValueParams = createEnumValueParamsCalculator(dialect)

  // --- union kind-dispatchers (lazy; default branch → dialect lookup → fall through) ---

  const schemaTypeRules = ({ value }: CrawlRulesContext): CompareRules => {
    const kind = readKind(value)
    switch (kind) {
      case TypeKind.BoolType:
      case TypeKind.JSONType:
      case TypeKind.SpatialType:
      case TypeKind.UUIDType:
      case TypeKind.UnsupportedType:
      case TypeKind.IntegerType:
      case TypeKind.DecimalType:
      case TypeKind.FloatType:
      case TypeKind.StringType:
      case TypeKind.BinaryType:
      case TypeKind.TimeType:
        return scalarTypeRules
      case TypeKind.EnumType:
        return enumTypeRules
      default:
        return (kind !== undefined ? dialect.typeRulesFor(kind) : undefined) ?? {}
    }
  }

  const attrRules = (ctx: CrawlRulesContext): CompareRules => asElement(resolveAttrRules(ctx))
  const resolveAttrRules = ({ value }: CrawlRulesContext): CompareRules => {
    const kind = readKind(value)
    switch (kind) {
      case AttrKind.Comment: return commentRules
      case AttrKind.Collation: return collationRules
      case AttrKind.Check: return checkRules
      case AttrKind.GeneratedExpr: return generatedExprRules
      default:
        return (kind !== undefined ? dialect.attrRulesFor(kind) : undefined) ?? {}
    }
  }

  const exprRules = ({ value }: CrawlRulesContext): CompareRules => {
    const kind = readKind(value)
    switch (kind) {
      case ExprKind.Literal: return literalRules
      case ExprKind.RawExpr: return rawExprRules
      case ObjectKind.NamedDefault: return namedDefaultRules
      default:
        return {}
    }
  }

  const objectRules = (ctx: CrawlRulesContext): CompareRules => asElement(resolveObjectRules(ctx))
  const resolveObjectRules = ({ value }: CrawlRulesContext): CompareRules => {
    const kind = readKind(value)
    switch (kind) {
      case ObjectKind.Table: return tableRules
      case ObjectKind.Index: return indexRules
      case ObjectKind.ForeignKey: return foreignKeyRules
      case ObjectKind.Check: return checkRules
      case ObjectKind.NamedDefault: return namedDefaultRules
      case ObjectKind.EnumType: return enumObjectRules
      default:
        return (kind !== undefined ? dialect.objectRulesFor(kind) : undefined) ?? {}
    }
  }

  // --- collection rules (identity-keyed) ---
  const attrsArrayRule: CompareRules = { mapping: attrsMappingResolver, '/*': attrRules }
  const objectsArrayRule: CompareRules = { mapping: attrsMappingResolver, '/*': objectRules }

  // --- SchemaType members ---
  // The engine descends into the SchemaType and reports a diff per changed property. The
  // cross-family breaking signal rides on the `/type` name (kind is suppressed; a cross-family
  // change always changes the canonical name). Within-kind size/precision/scale changes are
  // non-breaking (O1). `/unsigned` is a PG-irrelevant MySQL-ism (always false) → suppressed.
  //
  // An enum column's SchemaType is the EnumType declared in `objects`, so a column type change
  // to or from an enum adds or removes `/values` on the column's SchemaType. The `/type` name
  // change already reports it, and the diff would point at the enum's declaration even when the
  // enum itself is unchanged, so that add/remove is not reported.
  const typeFieldRules: CompareRules = {
    '/kind': SUPPRESS,
    '/unsigned': SUPPRESS,
    '/values': { [IGNORE_ADD_REMOVE_RULE]: true },
    '/type': { $: typeNameClassifier, description: columnFacetDescription }, // facet = type
    '/size': { $: allNonBreaking, description: columnFacetDescription },
    '/precision': { $: allNonBreaking, description: columnFacetDescription },
    '/scale': { $: allNonBreaking, description: columnFacetDescription },
  }
  const scalarTypeRules: CompareRules = typeFieldRules
  const enumTypeRules: CompareRules = {
    ...typeFieldRules,
    '/values': {
      [IGNORE_ADD_REMOVE_RULE]: true,
      mapping: enumValuesMappingResolver,
      // set semantics — a reorder maps a value to a new index; ignoreKeyDifference (on the
      // element) stops that index change being reported as a rename.
      '/*': {
        descriptionParamCalculator: enumValueParams,
        $: enumValueClassifier,
        [IGNORE_DIFFERENCE_IN_KEYS_RULE]: true,
        description: enumValueDescription,
      },
    },
    '/attrs': attrsArrayRule,
  }
  // The EnumType declaration itself (`CREATE TYPE … AS ENUM`), as a member of `objects`.
  const enumObjectRules: CompareRules = {
    ...enumTypeRules,
    descriptionParamCalculator: enumTypeParams,
    description: enumTypeDescription,
  }

  // --- Attr members ---
  // A Comment attr is a column/table/schema description (COMMENT ON …): documentation-only →
  // annotation, at the attr node (add/remove) and its text leaf (change).
  const commentRules: CompareRules = {
    descriptionParamCalculator: attrMemberParams,
    $: allAnnotation,
    description: commentDescription,
    '/kind': SUPPRESS,
    '/text': { $: allAnnotation, description: commentDescription },
  }
  // Collation is a column-level value attr. Changing the collation shifts sort/comparison
  // order (a result change) but never makes a SELECT fail to execute → non-breaking. The
  // param calculator renders it as the `collation` column facet. (Charset is a MySQL-ism not
  // emitted by the PostgreSQL parser and is intentionally not handled — out of scope.)
  const collationRules: CompareRules = {
    descriptionParamCalculator: attrMemberParams,
    $: allNonBreaking,
    description: columnFacetDescription,
    '/kind': SUPPRESS,
    '/value': { $: allNonBreaking, description: columnFacetDescription },
  }
  // Check is dual-role (Attr + SchemaObject, one `kind`); this single rule serves both. A
  // check is a write-time constraint invisible to SELECT → add/remove and expr change are
  // non-breaking.
  const checkRules: CompareRules = {
    descriptionParamCalculator: attrMemberParams,
    $: allNonBreaking,
    description: checkDescription,
    '/kind': SUPPRESS,
    '/expr': { $: allNonBreaking, description: checkDescription },
    '/attrs': attrsArrayRule,
  }
  // A generated-column expression (GENERATED ALWAYS AS (expr) STORED). Adding/removing/changing
  // it shifts the column's computed values (a result change) but the column stays selectable →
  // non-breaking. Rendered as the `generated expression` column facet.
  const generatedExprRules: CompareRules = {
    descriptionParamCalculator: attrMemberParams,
    $: allNonBreaking,
    description: columnFacetDescription,
    '/kind': SUPPRESS,
    '/expr': { $: allNonBreaking, description: columnFacetDescription },
  }

  // --- Expr members ---
  // Used for column.default (cases 8-10), index-part expressions, and NamedDefault. A default
  // add/remove/change never makes a SELECT fail → non-breaking. The default facet description
  // is selected by the param calculator only when the diff sits under a `default` path.
  const literalRules: CompareRules = {
    $: allNonBreaking,
    description: columnFacetDescription,
    '/kind': SUPPRESS,
    '/value': { $: allNonBreaking, description: columnFacetDescription },
  }
  const rawExprRules: CompareRules = {
    $: allNonBreaking,
    description: columnFacetDescription,
    '/kind': SUPPRESS,
    '/expr': { $: allNonBreaking, description: columnFacetDescription },
  }
  const namedDefaultRules: CompareRules = {
    $: allNonBreaking,
    description: columnFacetDescription,
    '/kind': SUPPRESS,
    '/expr': exprRules,
    '/attrs': attrsArrayRule,
  }

  // --- Column / ColumnType ---
  const columnTypeRules: CompareRules = {
    '/type': schemaTypeRules,
    '/raw': SUPPRESS, // redundant with /type
    '/null': { $: nullabilityClassifier, description: columnFacetDescription }, // facet = nullability
  }
  const columnRules: CompareRules = {
    // Serves the column's own add/remove and its scalar facets (type, nullability, default),
    // which render below it; column attrs (collation/generated/comment) carry their own.
    descriptionParamCalculator: columnParams,
    $: columnClassifier,
    description: columnDescription,
    '/type': columnTypeRules,
    '/default': exprRules,
    '/attrs': attrsArrayRule,
  }

  // --- Index / IndexPart ---
  // Indexes are performance-only and primary key/unique alter grain, not query validity →
  // all non-breaking. Parts are keyed by column name so a column-order swap surfaces as
  // `seqNo` replace diffs (non-breaking), not add/remove churn. A part names its column, so a
  // change to the column itself is reported only under `table.columns`.
  const indexPartRules: CompareRules = {
    $: allNonBreaking,
    description: indexDescription,
    '/seqNo': { $: allNonBreaking, description: indexDescription },
    '/expr': exprRules,
    '/attrs': attrsArrayRule,
  }
  const indexRules: CompareRules = {
    // Serves the whole index/primary key and its part/seqNo/unique sub-changes rendered below.
    descriptionParamCalculator: indexParams,
    $: allNonBreaking,
    description: indexDescription,
    '/kind': SUPPRESS,
    '/unique': { $: allNonBreaking, description: indexDescription },
    '/attrs': attrsArrayRule,
    '/parts': { mapping: indexPartMappingResolver, '/*': asElement(indexPartRules) },
  }

  // --- ForeignKey ---
  // FK add/remove and onUpdate/onDelete changes are write-time constraints invisible to a
  // reader → non-breaking. So is moving a key onto different columns or a different table: it
  // changes which rows the database accepts on write, while nothing a reader selects stops
  // resolving. Dropping the same column at its declaration site stays breaking.
  //
  // `/columns` and `/refColumns` are lists of column names, and `/refTable` is a
  // `{ schema, name }` reference; the columns and tables they name are diffed where they are
  // declared. Each is compared as one value at its slot, so a change reports one diff on the
  // key: a repoint that changes both the schema and the name of the target is one diff, not one
  // per field.
  const sameNames = (before: unknown, after: unknown): boolean =>
    isArray(before) && isArray(after) && before.length === after.length &&
    before.every((name, index) => name === after[index])
  const sameTableRef = (before: unknown, after: unknown): boolean =>
    isObject(before) && isObject(after) &&
    before[DdlapiProperties.Schema] === after[DdlapiProperties.Schema] &&
    before[DdlapiProperties.Name] === after[DdlapiProperties.Name]
  const compareAsOneValue = (same: (before: unknown, after: unknown) => boolean): CompareResolver => (ctx) => {
    if (same(ctx.before.value, ctx.after.value)) { return undefined }
    const diffEntry = createDiffEntry(ctx, diffFactory.replaced(ctx))
    return { diffs: [diffEntry.diff], ownerDiffEntry: diffEntry, merged: ctx.after.value }
  }
  const foreignKeyColumnsRules: CompareRules = {
    descriptionParamCalculator: foreignKeyParams,
    compare: compareAsOneValue(sameNames),
    $: allNonBreaking,
    description: foreignKeyDescription,
  }
  const foreignKeyRefTableRules: CompareRules = {
    descriptionParamCalculator: foreignKeyParams,
    compare: compareAsOneValue(sameTableRef),
    $: allNonBreaking,
    description: foreignKeyDescription,
  }
  const foreignKeyRules: CompareRules = {
    descriptionParamCalculator: foreignKeyParams,
    $: allNonBreaking,
    description: foreignKeyDescription,
    '/kind': SUPPRESS,
    '/columns': foreignKeyColumnsRules,
    '/refTable': foreignKeyRefTableRules,
    '/refColumns': foreignKeyColumnsRules,
    '/onUpdate': { $: allNonBreaking, description: foreignKeyDescription },
    '/onDelete': { $: allNonBreaking, description: foreignKeyDescription },
    '/attrs': attrsArrayRule,
  }

  // --- Table ---
  const tableRules: CompareRules = {
    descriptionParamCalculator: tableParams,
    $: tableClassifier,
    description: tableDescription,
    '/kind': SUPPRESS,
    '/columns': { mapping: nameMappingResolver, '/*': asElement(columnRules) },
    '/indexes': { mapping: indexMappingResolver, '/*': asElement(indexRules) },
    '/primaryKey': indexRules,
    '/foreignKeys': { mapping: foreignKeyMappingResolver, '/*': asElement(foreignKeyRules) },
    '/attrs': attrsArrayRule,
    '/objects': objectsArrayRule,
  }

  // --- Schema ---
  const schemaRules: CompareRules = {
    '/tables': { mapping: nameMappingResolver, '/*': asElement(tableRules) },
    '/attrs': attrsArrayRule,
    '/objects': objectsArrayRule,
  }

  // --- Realm (root) ---
  return {
    // Single root-level catch-all: any node without a more specific rule classifies as
    // `unclassified`. `/**` is propagated to descendants by json-crawl. Description params come
    // from the per-family calculators attached on the subtree nodes above.
    '/**': { $: allUnclassified },
    '/schemas': { mapping: nameMappingResolver, '/*': asElement(schemaRules) },
    '/attrs': attrsArrayRule,
    '/objects': objectsArrayRule,
  }
}
