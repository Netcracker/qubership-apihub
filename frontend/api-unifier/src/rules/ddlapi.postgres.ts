import { DdlapiProperties, PgAttrKind, PgGeneratedExprType, PgObjectKind, PgTypeKind } from '@netcracker/qubership-apihub-ddlapi'
import { NormalizationRules } from '../types'
import { checkContains, checkType, TYPE_ARRAY, TYPE_BOOLEAN, TYPE_JSON_ANY, TYPE_NUMBER, TYPE_OBJECT, TYPE_STRING } from '../validate/checker'
import { DdlApiDialect, DIALECT_ID_POSTGRES } from './ddlapi.dialect'

// Accept any JSON value (and any nested content) without stripping — used for opaque,
// PG-specific data blobs (partition spec, exclusions, composite fields, base type, …)
// that api-unifier compares opaquely and only needs to pass through + carry origins.
const ANY_DESCENDANT: NormalizationRules = { validate: checkType(...TYPE_JSON_ANY) }
const ANY_RULE: NormalizationRules = { validate: checkType(...TYPE_JSON_ANY), '/**': ANY_DESCENDANT }

const pgKind = (kindValue: string): NormalizationRules => ({
  validate: [checkType(TYPE_STRING), checkContains(kindValue)],
})

// Each rule validates `kind` + the documented fields, treats opaque structured fields as
// ANY_RULE, and keeps a `/**` catch-all so unforeseen fields pass through (escape-hatch
// resilience). The model-aware origins walk decorates these generically.
const identityRules: NormalizationRules = {
  '/kind': pgKind(PgAttrKind.Identity),
  '/generation': { validate: checkType(TYPE_STRING) },
  '/seqStart': { validate: checkType(TYPE_NUMBER) },
  '/seqIncrement': { validate: checkType(TYPE_NUMBER) },
  '/**': ANY_DESCENDANT,
  validate: checkType(TYPE_OBJECT),
}
const partitionRules: NormalizationRules = {
  '/kind': pgKind(PgAttrKind.Partition),
  '/type': { validate: checkType(TYPE_STRING) },
  '/parts': ANY_RULE,
  '/**': ANY_DESCENDANT,
  validate: checkType(TYPE_OBJECT),
}
const inheritsRules: NormalizationRules = {
  '/kind': pgKind(PgAttrKind.Inherits),
  '/parents': { '/*': { validate: checkType(TYPE_STRING) }, validate: checkType(TYPE_ARRAY) },
  '/**': ANY_DESCENDANT,
  validate: checkType(TYPE_OBJECT),
}
const storageParamsRules: NormalizationRules = {
  '/kind': pgKind(PgAttrKind.StorageParams),
  '/params': ANY_RULE,
  '/**': ANY_DESCENDANT,
  validate: checkType(TYPE_OBJECT),
}
const triggerRules: NormalizationRules = {
  '/kind': pgKind(PgAttrKind.Trigger),
  '/name': { validate: checkType(TYPE_STRING) },
  '/timing': { validate: checkType(TYPE_STRING) },
  '/events': ANY_RULE,
  '/forEachRow': { validate: checkType(TYPE_BOOLEAN) },
  '/funcName': { validate: checkType(TYPE_STRING) },
  '/when': { validate: checkType(TYPE_STRING) },
  '/isConstraint': { validate: checkType(TYPE_BOOLEAN) },
  '/deferrable': { validate: checkType(TYPE_BOOLEAN) },
  '/initDeferred': { validate: checkType(TYPE_BOOLEAN) },
  '/**': ANY_DESCENDANT,
  validate: checkType(TYPE_OBJECT),
}
const indexIncludeRules: NormalizationRules = {
  '/kind': pgKind(PgAttrKind.IndexInclude),
  '/columns': { '/*': { validate: checkType(TYPE_STRING) }, validate: checkType(TYPE_ARRAY) },
  '/**': ANY_DESCENDANT,
  validate: checkType(TYPE_OBJECT),
}
const indexNullsDistinctRules: NormalizationRules = {
  '/kind': pgKind(PgAttrKind.IndexNullsDistinct),
  '/value': { validate: checkType(TYPE_BOOLEAN) },
  '/**': ANY_DESCENDANT,
  validate: checkType(TYPE_OBJECT),
}
const indexTypeRules: NormalizationRules = {
  '/kind': pgKind(PgAttrKind.IndexType),
  '/type': { validate: checkType(TYPE_STRING) },
  '/**': ANY_DESCENDANT,
  validate: checkType(TYPE_OBJECT),
}
const indexPredicateRules: NormalizationRules = {
  '/kind': pgKind(PgAttrKind.IndexPredicate),
  '/predicate': { validate: checkType(TYPE_STRING) },
  '/**': ANY_DESCENDANT,
  validate: checkType(TYPE_OBJECT),
}
const concurrentlyRules: NormalizationRules = {
  '/kind': pgKind(PgAttrKind.Concurrently),
  '/**': ANY_DESCENDANT,
  validate: checkType(TYPE_OBJECT),
}
const indexColumnPropRules: NormalizationRules = {
  '/kind': pgKind(PgAttrKind.IndexColumnProp),
  '/nullsFirst': { validate: checkType(TYPE_BOOLEAN) },
  '/nullsLast': { validate: checkType(TYPE_BOOLEAN) },
  '/**': ANY_DESCENDANT,
  validate: checkType(TYPE_OBJECT),
}
const indexOpClassRules: NormalizationRules = {
  '/kind': pgKind(PgAttrKind.IndexOpClass),
  '/name': { validate: checkType(TYPE_STRING) },
  '/**': ANY_DESCENDANT,
  validate: checkType(TYPE_OBJECT),
}
const excludeConstraintRules: NormalizationRules = {
  '/kind': pgKind(PgObjectKind.ExcludeConstraint),
  '/name': { validate: checkType(TYPE_STRING) },
  '/method': { validate: checkType(TYPE_STRING) },
  '/exclusions': ANY_RULE,
  '/**': ANY_DESCENDANT,
  validate: checkType(TYPE_OBJECT),
}
const compositeTypeRules: NormalizationRules = {
  '/kind': pgKind(PgObjectKind.CompositeType),
  '/name': { validate: checkType(TYPE_STRING) },
  '/fields': ANY_RULE,
  '/**': ANY_DESCENDANT,
  validate: checkType(TYPE_OBJECT),
}
const rangeTypeRules: NormalizationRules = {
  '/kind': pgKind(PgObjectKind.RangeType),
  '/name': { validate: checkType(TYPE_STRING) },
  '/subtype': { validate: checkType(TYPE_STRING) },
  '/params': ANY_RULE,
  '/**': ANY_DESCENDANT,
  validate: checkType(TYPE_OBJECT),
}
// Domain is dual-role: a SchemaObject in schema.objects AND a SchemaType at column.type.type.
const domainRules: NormalizationRules = {
  '/kind': pgKind(PgObjectKind.Domain),
  '/type': { validate: checkType(TYPE_STRING) },
  '/baseType': ANY_RULE, // a SchemaType, compared opaquely
  '/null': { validate: checkType(TYPE_BOOLEAN) },
  '/default': ANY_RULE, // an Expr
  '/checks': ANY_RULE, // Check[]
  '/**': ANY_DESCENDANT,
  validate: checkType(TYPE_OBJECT),
}

const ATTR_RULES: Record<string, NormalizationRules> = {
  [PgAttrKind.Identity]: identityRules,
  [PgAttrKind.Partition]: partitionRules,
  [PgAttrKind.Inherits]: inheritsRules,
  [PgAttrKind.StorageParams]: storageParamsRules,
  [PgAttrKind.Trigger]: triggerRules,
  [PgAttrKind.IndexInclude]: indexIncludeRules,
  [PgAttrKind.IndexNullsDistinct]: indexNullsDistinctRules,
  [PgAttrKind.IndexType]: indexTypeRules,
  [PgAttrKind.IndexPredicate]: indexPredicateRules,
  [PgAttrKind.Concurrently]: concurrentlyRules,
  [PgAttrKind.IndexColumnProp]: indexColumnPropRules,
  [PgAttrKind.IndexOpClass]: indexOpClassRules,
}

const OBJECT_RULES: Record<string, NormalizationRules> = {
  [PgObjectKind.ExcludeConstraint]: excludeConstraintRules,
  [PgObjectKind.CompositeType]: compositeTypeRules,
  [PgObjectKind.RangeType]: rangeTypeRules,
  [PgObjectKind.Domain]: domainRules,
}

const TYPE_RULES: Record<string, NormalizationRules> = {
  [PgTypeKind.Domain]: domainRules,
}

/**
 * PostgreSQL dialect. Supplies rules for the PG escape-hatch kinds and the
 * dialect-specific primitive defaults (unsigned, GeneratedExpr.type='STORED'). Composes
 * onto the driver-neutral core through the registry the core consults; unknown-to-PG kinds
 * still fall back to the core generic passthrough.
 */
export const DIALECT_POSTGRES: DdlApiDialect = {
  id: DIALECT_ID_POSTGRES,
  attrRulesFor: (kind) => ATTR_RULES[kind],
  objectRulesFor: (kind) => OBJECT_RULES[kind],
  typeRulesFor: (kind) => TYPE_RULES[kind],
  primitiveDefaults: {
    [DdlapiProperties.Unsigned]: false,
    [DdlapiProperties.Type]: PgGeneratedExprType.Stored,
  },
}
