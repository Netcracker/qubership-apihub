import { CrawlRulesContext, isObject } from '@netcracker/qubership-apihub-json-crawl'
import { NormalizationRules, NormalizeOptions, UnifyFunction } from '../types'
import { SPEC_TYPE_DDL_API_1 } from '../spec-type'
import {
  checkContains,
  checkType,
  TYPE_ARRAY,
  TYPE_BOOLEAN,
  TYPE_JSON_ANY,
  TYPE_NUMBER,
  TYPE_OBJECT,
  TYPE_STRING,
} from '../validate/checker'
import { AttrKind, DdlapiProperties, ExprKind, ObjectKind, ReferenceOption, TypeKind } from '@netcracker/qubership-apihub-ddlapi'
import { DefaultValueMapping, valueDefaults } from '../unifies/defaults'
import { EMPTY_MARKER, ReplaceMapping, TO_EMPTY_ARRAY_MAPPING, valueReplaces } from '../unifies/replaces'
import { ddlApiNullabilityDefault, reportDanglingForeignKey } from '../unifies/ddlapi'
import { DdlApiDialect } from './ddlapi.dialect'

export type DdlApiSpecVersion = typeof SPEC_TYPE_DDL_API_1

/**
 * Canonical option bundle for normalizing ddlapi documents. ddlapi documents have
 * no `allOf` / traits / `$ref`, so those stages are turned off; leaving them at their
 * `true` defaults would do wasteful (and on the cyclic Realm graph, meaningless) work.
 * Exported as one constant so api-diff imports a stable contract instead of six flags.
 */
export const DDL_API_NORMALIZE_OPTIONS: Readonly<NormalizeOptions> = {
  validate: true,
  unify: true,
  mergeAllOf: false,
  mergeTraits: false,
  liftCombiners: false,
  resolveRef: false,
}

const REFERENCE_OPTION_VALUES = Object.values(ReferenceOption)

// Validates the discriminant `kind` carries exactly the expected union-member string.
const kindRule = (kindValue: string): NormalizationRules => ({
  validate: [checkType(TYPE_STRING), checkContains(kindValue)],
})

const readKind = (value: unknown): string | undefined =>
  isObject(value) && 'kind' in value && typeof value.kind === 'string'
    ? value.kind
    : undefined

// Empty-collection normalization + reversible primitive defaults. Absent array
// properties become `[]` (TO_EMPTY_ARRAY_MAPPING); listed primitive defaults are added
// reversibly. `valueDefaults` runs before the `valueReplaces` that consumes its EMPTY_MARKER.
const collectionUnify = (arrayKeys: string[], primitiveDefaults: DefaultValueMapping = {}): UnifyFunction[] => {
  const defaults: DefaultValueMapping = { ...primitiveDefaults }
  const replaces: Record<string, ReplaceMapping> = {}
  for (const key of arrayKeys) {
    defaults[key] = EMPTY_MARKER
    replaces[key] = TO_EMPTY_ARRAY_MAPPING
  }
  return [valueDefaults(defaults), valueReplaces(replaces)]
}

const emptyArrayUnify = (...keys: string[]): UnifyFunction[] => collectionUnify(keys)

/**
 * Core, driver-neutral ddlapi rules factory. Parameterized by version (one today —
 * the seam for future stamps) and a `DdlApiDialect` that supplies dialect-specific rules
 * for the four open `kind`-unions. All rule nodes are declared inside this closure so
 * they capture `dialect`; the kind-dispatchers (`schemaTypeRules`, `attrRules`,
 * `exprRules`, `objectRules`) and the cyclic edge (`fk.refTable`) are resolved lazily
 * at crawl time, so declaration order only matters for eager references.
 *
 * Covers structural + value validation (`checkType`/`checkContains`) and empty-collection
 * and primitive defaults (`unify`). Dialect-specific kinds and primitive defaults come from
 * the injected `dialect`; kinds it does not recognise fall through to the generic
 * `Unknown*` passthrough.
 */
export const ddlApiRules = (_version: DdlApiSpecVersion, dialect: DdlApiDialect): NormalizationRules => {
  // Pick the dialect-provided primitive defaults (e.g. `unsigned`,
  // GeneratedExpr `type`) for the given property keys. Empty when the dialect supplies none,
  // keeping core dialect-agnostic.
  const dialectPrimitive = (...keys: string[]): DefaultValueMapping => {
    const out: DefaultValueMapping = {}
    const provided = dialect.primitiveDefaults
    if (!provided) { return out }
    for (const key of keys) {
      if (provided[key] !== undefined) { out[key] = provided[key] }
    }
    return out
  }

  // Driver-neutral or future kinds we do not model: validate only that `kind` is a
  // string and let arbitrary nested content pass. Used as the shared fallback.
  const unknownPassthroughRules: NormalizationRules = {
    '/kind': { validate: checkType(TYPE_STRING) },
    '/**': { validate: checkType(...TYPE_JSON_ANY) },
    validate: checkType(TYPE_OBJECT),
  }

  // --- union kind-dispatchers (lazy bodies; default branch → dialect lookup → fallback) ---

  const schemaTypeRules = ({ value }: CrawlRulesContext): NormalizationRules => {
    const kind = readKind(value)
    switch (kind) {
      case TypeKind.BoolType:
      case TypeKind.JSONType:
      case TypeKind.SpatialType:
      case TypeKind.UUIDType:
      case TypeKind.UnsupportedType:
        return scalarTypeRules(kind)
      case TypeKind.IntegerType: return integerTypeRules
      case TypeKind.DecimalType: return decimalTypeRules
      case TypeKind.FloatType: return floatTypeRules
      case TypeKind.StringType: return stringTypeRules
      case TypeKind.BinaryType: return binaryTypeRules
      case TypeKind.TimeType: return timeTypeRules
      case TypeKind.EnumType: return enumTypeRules
      default:
        return (kind !== undefined ? dialect.typeRulesFor(kind) : undefined) ?? unknownPassthroughRules
    }
  }

  const attrRules = ({ value }: CrawlRulesContext): NormalizationRules => {
    const kind = readKind(value)
    switch (kind) {
      case AttrKind.Comment: return commentRules
      case AttrKind.Charset: return charsetRules
      case AttrKind.Collation: return collationRules
      case AttrKind.Check: return checkRules
      case AttrKind.GeneratedExpr: return generatedExprRules
      default:
        return (kind !== undefined ? dialect.attrRulesFor(kind) : undefined) ?? unknownPassthroughRules
    }
  }

  const exprRules = ({ value }: CrawlRulesContext): NormalizationRules => {
    const kind = readKind(value)
    switch (kind) {
      case ExprKind.Literal: return literalRules
      case ExprKind.RawExpr: return rawExprRules
      case ObjectKind.NamedDefault: return namedDefaultRules
      default:
        // Expr has no dialect lookup (no escape-hatch Expr kinds are emitted); fall back.
        return unknownPassthroughRules
    }
  }

  const objectRules = ({ value }: CrawlRulesContext): NormalizationRules => {
    const kind = readKind(value)
    switch (kind) {
      case ObjectKind.Table: return tableRules
      case ObjectKind.View: return viewRules
      case ObjectKind.Index: return indexRules
      case ObjectKind.ForeignKey: return foreignKeyRules
      case ObjectKind.Check: return checkRules
      case ObjectKind.NamedDefault: return namedDefaultRules
      case ObjectKind.EnumType: return enumTypeRules
      default:
        return (kind !== undefined ? dialect.objectRulesFor(kind) : undefined) ?? unknownPassthroughRules
    }
  }

  // --- collection rules ---
  const attrsArrayRule: NormalizationRules = { '/*': attrRules, validate: checkType(TYPE_ARRAY) }
  const objectsArrayRule: NormalizationRules = { '/*': objectRules, validate: checkType(TYPE_ARRAY) }
  const depsArrayRule: NormalizationRules = objectsArrayRule

  // --- SchemaType members ---
  // Bool/JSON/Spatial/UUID/Unsupported: just { kind, type }.
  const scalarTypeRules = (kindValue: string): NormalizationRules => ({
    '/kind': kindRule(kindValue),
    '/type': { validate: checkType(TYPE_STRING) },
    validate: checkType(TYPE_OBJECT),
  })
  const integerTypeRules: NormalizationRules = {
    '/kind': kindRule(TypeKind.IntegerType),
    '/type': { validate: checkType(TYPE_STRING) },
    '/unsigned': { validate: checkType(TYPE_BOOLEAN) },
    '/attrs': attrsArrayRule,
    validate: checkType(TYPE_OBJECT),
    // unsigned is a dialect concept (MySQL); PG defaults it to false.
    unify: collectionUnify([DdlapiProperties.Attrs], dialectPrimitive(DdlapiProperties.Unsigned)),
  }
  const decimalTypeRules: NormalizationRules = {
    '/kind': kindRule(TypeKind.DecimalType),
    '/type': { validate: checkType(TYPE_STRING) },
    '/precision': { validate: checkType(TYPE_NUMBER) },
    '/scale': { validate: checkType(TYPE_NUMBER) },
    '/unsigned': { validate: checkType(TYPE_BOOLEAN) },
    validate: checkType(TYPE_OBJECT),
    unify: collectionUnify([], dialectPrimitive(DdlapiProperties.Unsigned)),
  }
  const floatTypeRules: NormalizationRules = {
    '/kind': kindRule(TypeKind.FloatType),
    '/type': { validate: checkType(TYPE_STRING) },
    '/unsigned': { validate: checkType(TYPE_BOOLEAN) },
    '/precision': { validate: checkType(TYPE_NUMBER) },
    validate: checkType(TYPE_OBJECT),
    unify: collectionUnify([], dialectPrimitive(DdlapiProperties.Unsigned)),
  }
  const stringTypeRules: NormalizationRules = {
    '/kind': kindRule(TypeKind.StringType),
    '/type': { validate: checkType(TYPE_STRING) },
    '/size': { validate: checkType(TYPE_NUMBER) },
    '/attrs': attrsArrayRule,
    validate: checkType(TYPE_OBJECT),
    unify: emptyArrayUnify(DdlapiProperties.Attrs),
  }
  const binaryTypeRules: NormalizationRules = {
    '/kind': kindRule(TypeKind.BinaryType),
    '/type': { validate: checkType(TYPE_STRING) },
    '/size': { validate: checkType(TYPE_NUMBER) },
    validate: checkType(TYPE_OBJECT),
  }
  const timeTypeRules: NormalizationRules = {
    '/kind': kindRule(TypeKind.TimeType),
    '/type': { validate: checkType(TYPE_STRING) },
    '/precision': { validate: checkType(TYPE_NUMBER) },
    '/scale': { validate: checkType(TYPE_NUMBER) },
    '/attrs': attrsArrayRule,
    validate: checkType(TYPE_OBJECT),
    unify: emptyArrayUnify(DdlapiProperties.Attrs),
  }
  const enumTypeRules: NormalizationRules = {
    '/kind': kindRule(TypeKind.EnumType),
    '/type': { validate: checkType(TYPE_STRING) },
    '/values': { '/*': { validate: checkType(TYPE_STRING) }, validate: checkType(TYPE_ARRAY) },
    '/attrs': attrsArrayRule,
    validate: checkType(TYPE_OBJECT),
    unify: emptyArrayUnify(DdlapiProperties.Attrs),
  }

  // --- Attr members ---
  const commentRules: NormalizationRules = {
    '/kind': kindRule(AttrKind.Comment),
    '/text': { validate: checkType(TYPE_STRING) },
    validate: checkType(TYPE_OBJECT),
  }
  const charsetRules: NormalizationRules = {
    '/kind': kindRule(AttrKind.Charset),
    '/value': { validate: checkType(TYPE_STRING) },
    validate: checkType(TYPE_OBJECT),
  }
  const collationRules: NormalizationRules = {
    '/kind': kindRule(AttrKind.Collation),
    '/value': { validate: checkType(TYPE_STRING) },
    validate: checkType(TYPE_OBJECT),
  }
  // Check is both an Attr and a SchemaObject (same `kind` string) — one rule serves both.
  const checkRules: NormalizationRules = {
    '/kind': kindRule(AttrKind.Check),
    '/name': { validate: checkType(TYPE_STRING) },
    '/expr': { validate: checkType(TYPE_STRING) },
    '/attrs': attrsArrayRule,
    validate: checkType(TYPE_OBJECT),
    unify: emptyArrayUnify(DdlapiProperties.Attrs),
  }
  const generatedExprRules: NormalizationRules = {
    '/kind': kindRule(AttrKind.GeneratedExpr),
    '/expr': { validate: checkType(TYPE_STRING) },
    '/type': { validate: checkType(TYPE_STRING) },
    validate: checkType(TYPE_OBJECT),
    // PG only supports STORED generated columns → default GeneratedExpr.type.
    unify: collectionUnify([], dialectPrimitive(DdlapiProperties.Type)),
  }

  // --- Expr members ---
  const literalRules: NormalizationRules = {
    '/kind': kindRule(ExprKind.Literal),
    '/value': { validate: checkType(TYPE_STRING) },
    validate: checkType(TYPE_OBJECT),
  }
  const rawExprRules: NormalizationRules = {
    '/kind': kindRule(ExprKind.RawExpr),
    '/expr': { validate: checkType(TYPE_STRING) },
    validate: checkType(TYPE_OBJECT),
  }
  const namedDefaultRules: NormalizationRules = {
    '/kind': kindRule(ObjectKind.NamedDefault),
    '/name': { validate: checkType(TYPE_STRING) },
    '/expr': exprRules, // Literal | RawExpr
    '/attrs': attrsArrayRule,
    validate: checkType(TYPE_OBJECT),
    unify: emptyArrayUnify(DdlapiProperties.Attrs),
  }

  // --- Column / ColumnType ---
  const columnTypeRules: NormalizationRules = {
    '/type': schemaTypeRules,
    '/raw': { validate: checkType(TYPE_STRING) },
    '/null': { validate: checkType(TYPE_BOOLEAN) },
    validate: checkType(TYPE_OBJECT),
  }
  const columnRules: NormalizationRules = {
    '/name': { validate: checkType(TYPE_STRING) },
    '/type': columnTypeRules,
    '/default': exprRules,
    '/attrs': attrsArrayRule,
    validate: checkType(TYPE_OBJECT),
    unify: emptyArrayUnify(DdlapiProperties.Attrs),
  }

  // --- Index / IndexPart ---
  const indexPartRules: NormalizationRules = {
    '/seqNo': { validate: checkType(TYPE_NUMBER) },
    '/desc': { validate: checkType(TYPE_BOOLEAN) },
    '/expr': exprRules,
    '/column': columnRules, // reference edge to a table column (same instance)
    '/attrs': attrsArrayRule,
    validate: checkType(TYPE_OBJECT),
    // desc:false — ascending is the SQL default.
    unify: collectionUnify([DdlapiProperties.Attrs], { [DdlapiProperties.Desc]: false }),
  }
  const indexRules: NormalizationRules = {
    '/kind': kindRule(ObjectKind.Index),
    '/name': { validate: checkType(TYPE_STRING) },
    '/unique': { validate: checkType(TYPE_BOOLEAN) },
    '/attrs': attrsArrayRule,
    '/parts': { '/*': indexPartRules, validate: checkType(TYPE_ARRAY) },
    validate: checkType(TYPE_OBJECT),
    // unique:false — an unmarked index is non-unique.
    unify: collectionUnify([DdlapiProperties.Attrs, DdlapiProperties.Parts], { [DdlapiProperties.Unique]: false }),
  }

  // --- ForeignKey ---
  const foreignKeyRules: NormalizationRules = {
    '/kind': kindRule(ObjectKind.ForeignKey),
    '/symbol': { validate: checkType(TYPE_STRING) },
    '/columns': { '/*': columnRules, validate: checkType(TYPE_ARRAY) },
    // refTable resolved lazily: tableRules is declared after foreignKeyRules.
    '/refTable': () => tableRules,
    '/refColumns': { '/*': columnRules, validate: checkType(TYPE_ARRAY) },
    '/onUpdate': { validate: [checkType(TYPE_STRING), checkContains(...REFERENCE_OPTION_VALUES)] },
    '/onDelete': { validate: [checkType(TYPE_STRING), checkContains(...REFERENCE_OPTION_VALUES)] },
    '/attrs': attrsArrayRule,
    validate: checkType(TYPE_OBJECT),
    // onUpdate/onDelete default to ANSI 'NO ACTION'; dangling-refTable reporter.
    unify: [
      ...collectionUnify([DdlapiProperties.Attrs], {
        [DdlapiProperties.OnUpdate]: ReferenceOption.NoAction,
        [DdlapiProperties.OnDelete]: ReferenceOption.NoAction,
      }),
      reportDanglingForeignKey,
    ],
  }

  // --- View: minimal defensive rule until a producer emits views ---
  const viewRules: NormalizationRules = {
    '/kind': kindRule(ObjectKind.View),
    '/name': { validate: checkType(TYPE_STRING) },
    '/def': { validate: checkType(TYPE_STRING) },
    '/columns': { '/*': columnRules, validate: checkType(TYPE_ARRAY) },
    '/attrs': attrsArrayRule,
    '/deps': depsArrayRule,
    validate: checkType(TYPE_OBJECT),
    unify: emptyArrayUnify(DdlapiProperties.Columns, DdlapiProperties.Attrs, DdlapiProperties.Deps),
  }

  // --- Table ---
  const tableRules: NormalizationRules = {
    '/kind': kindRule(ObjectKind.Table),
    '/name': { validate: checkType(TYPE_STRING) },
    '/columns': { '/*': columnRules, validate: checkType(TYPE_ARRAY) },
    '/indexes': { '/*': indexRules, validate: checkType(TYPE_ARRAY) },
    '/primaryKey': indexRules,
    '/foreignKeys': { '/*': foreignKeyRules, validate: checkType(TYPE_ARRAY) },
    '/attrs': attrsArrayRule,
    '/objects': objectsArrayRule,
    '/deps': depsArrayRule,
    validate: checkType(TYPE_OBJECT),
    // primaryKey is intentionally NOT defaulted: its absence means "no PK".
    // ddlApiNullabilityDefault runs at the table level because PK-aware nullability needs
    // table scope; it owns ColumnType.null and mutates shared types in place.
    unify: [
      ...collectionUnify([
        DdlapiProperties.Columns,
        DdlapiProperties.Indexes,
        DdlapiProperties.ForeignKeys,
        DdlapiProperties.Attrs,
        DdlapiProperties.Objects,
        DdlapiProperties.Deps,
      ]),
      ddlApiNullabilityDefault,
    ],
  }

  // --- Schema ---
  const schemaRules: NormalizationRules = {
    '/name': { validate: checkType(TYPE_STRING) },
    '/tables': { '/*': tableRules, validate: checkType(TYPE_ARRAY) },
    '/attrs': attrsArrayRule,
    '/objects': objectsArrayRule,
    validate: checkType(TYPE_OBJECT),
    unify: emptyArrayUnify(DdlapiProperties.Tables, DdlapiProperties.Attrs, DdlapiProperties.Objects),
  }

  // --- Realm (root) ---
  return {
    '/ddlapi': { validate: checkType(TYPE_STRING) },
    '/schemas': { '/*': schemaRules, validate: checkType(TYPE_ARRAY) },
    '/attrs': attrsArrayRule,
    '/objects': objectsArrayRule,
    validate: checkType(TYPE_OBJECT),
    // schemas is required — present, not defaulted.
    unify: emptyArrayUnify(DdlapiProperties.Attrs, DdlapiProperties.Objects),
  }
}
