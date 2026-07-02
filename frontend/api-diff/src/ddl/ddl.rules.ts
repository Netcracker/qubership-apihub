import { CrawlRulesContext } from '@netcracker/qubership-apihub-json-crawl'
import { allAnnotation, allNonBreaking, allUnclassified } from '../core'
import {
  CompareMode,
  CompareRule,
  CompareRules,
  IGNORE_DIFFERENCE_IN_KEYS_RULE,
  IGNORE_DIFFERENCE_RULE,
} from '../types'
import {
  AttrKind,
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
  indexPartMappingResolver,
  nameMappingResolver,
  symbolMappingResolver,
} from './ddl.mapping'
import {
  checkDescription,
  columnDescription,
  columnFacetDescription,
  commentDescription,
  createAttrMemberParamsCalculator,
  createColumnParamsCalculator,
  createEnumValueParamsCalculator,
  createForeignKeyParamsCalculator,
  createIndexParamsCalculator,
  createTableParamsCalculator,
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
// because the same rule objects (columnRules, tableRules, indexRules) are reused both as
// keyed-array elements *and* as plain single-reference edges (`/primaryKey`, `/refTable`,
// `/column`), where the flag is meaningless. Keeping it a per-use-site copy leaves the shared
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
 * dispatchers and the cyclic `fk.refTable` edge are resolved lazily at crawl time.
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
      case ObjectKind.EnumType: return enumTypeRules
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
  const typeFieldRules: CompareRules = {
    '/kind': SUPPRESS,
    '/unsigned': SUPPRESS,
    '/type': { $: typeNameClassifier, description: columnFacetDescription }, // facet = type
    '/size': { $: allNonBreaking, description: columnFacetDescription },
    '/precision': { $: allNonBreaking, description: columnFacetDescription },
    '/scale': { $: allNonBreaking, description: columnFacetDescription },
  }
  const scalarTypeRules: CompareRules = typeFieldRules
  const enumTypeRules: CompareRules = {
    ...typeFieldRules,
    '/values': {
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
  // all non-breaking. Parts are keyed by referenced column name so a
  // column-order swap surfaces as `seqNo` replace diffs (non-breaking), not add/remove churn.
  const indexPartRules: CompareRules = {
    $: allNonBreaking,
    description: indexDescription,
    '/seqNo': { $: allNonBreaking, description: indexDescription },
    '/expr': exprRules,
    '/column': columnRules, // reference edge to a table column (same instance)
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
  // FK add/remove and onUpdate/onDelete/refColumns changes are write-time constraints
  // invisible to a reader → non-breaking. refTable reuses the table rule via a lazy
  // cyclic edge — never cloned (the shared-instance contract).
  const foreignKeyRules: CompareRules = {
    descriptionParamCalculator: foreignKeyParams,
    $: allNonBreaking,
    description: foreignKeyDescription,
    '/kind': SUPPRESS,
    '/columns': { mapping: nameMappingResolver, '/*': asElement(columnRules) },
    '/refTable': () => tableRules, // lazy cyclic edge to a shared Table instance
    '/refColumns': { mapping: nameMappingResolver, '/*': asElement(columnRules) },
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
    '/indexes': { mapping: nameMappingResolver, '/*': asElement(indexRules) },
    '/primaryKey': indexRules,
    '/foreignKeys': { mapping: symbolMappingResolver, '/*': asElement(foreignKeyRules) },
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
