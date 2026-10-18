import { addNonBreaking, allNonBreaking, breaking, breakingIf, nonBreaking } from '../core'
import { ClassifyRule, DiffTypeClassifier } from '../types'
import { TypeConsumptionFamily, TypeKind } from './ddl.const'
import { DdlDiffDialect } from './ddl.dialect'
import { readKind } from './ddl.utils'

// --- structural add/remove classifiers ---
// Adding a table/column never breaks an existing query; deleting one makes a previously
// valid SELECT fail to resolve. add→nonBreaking, remove/replace→breaking.
export const tableClassifier: ClassifyRule = addNonBreaking
export const columnClassifier: ClassifyRule = addNonBreaking

// --- nullability ---
// A nullability change never makes a SELECT fail to execute, in either direction.
export const nullabilityClassifier: ClassifyRule = allNonBreaking

// --- enum values ---
// The allowed-value set is a write constraint; no SELECT fails when a value is added or
// removed (a removed category simply stops appearing) — both non-breaking.
export const enumValueClassifier: ClassifyRule = allNonBreaking

// --- column type change ---

/**
 * Maps a `SchemaType` to how a dashboard consumes its values. Core, closed kinds
 * are classified here; escape-hatch kinds defer to the dialect, falling back to `opaque`.
 */
export const consumptionFamily = (schemaType: unknown, dialect: DdlDiffDialect): TypeConsumptionFamily => {
  switch (readKind(schemaType)) {
    case TypeKind.BoolType:
      return TypeConsumptionFamily.Boolean
    case TypeKind.IntegerType:
    case TypeKind.DecimalType:
    case TypeKind.FloatType:
      return TypeConsumptionFamily.Numeric
    case TypeKind.StringType:
      return TypeConsumptionFamily.Textual
    case TypeKind.BinaryType:
      return TypeConsumptionFamily.Binary
    case TypeKind.TimeType:
      return TypeConsumptionFamily.Temporal
    case TypeKind.JSONType:
      return TypeConsumptionFamily.Json
    case TypeKind.UUIDType:
      return TypeConsumptionFamily.Uuid
    case TypeKind.EnumType:
      return TypeConsumptionFamily.Enum
    default:
      // SpatialType / UnsupportedType / dialect escape-hatch / undecidable → opaque.
      return dialect.typeFamilyFor?.(schemaType) ?? TypeConsumptionFamily.Opaque
  }
}

/**
 * `true` iff old→new keeps every type-valid operation valid: same family and not `opaque`.
 * `opaque` on either side (or family undecidable) ⇒ `false` (conservative breaking).
 */
export const sameConsumptionFamily = (before: unknown, after: unknown, dialect: DdlDiffDialect): boolean => {
  const beforeFamily = consumptionFamily(before, dialect)
  const afterFamily = consumptionFamily(after, dialect)
  return beforeFamily === afterFamily && beforeFamily !== TypeConsumptionFamily.Opaque
}

/**
 * Classifier for the `SchemaType` **`/type` name** field (`column.type.type.type`). The engine
 * descends into the SchemaType and reports a diff per changed property; the cross-family
 * breaking signal rides on the canonical type-name change, because `/kind` is suppressed and
 * a cross-family change always changes the name. The verdict is computed from the **immediate
 * parent** SchemaType on each side (available on both sides for a name replace):
 * same family → non-breaking; cross family (or opaque) → breaking. Within-kind size/precision/
 * scale changes carry no family change and are non-breaking (classified `allNonBreaking`, O1).
 *
 * add → non-breaking: `type` is required on every SchemaType, so its appearance can only mean
 * a previously-incomplete spec was corrected, never a query-breaking change. remove → breaking:
 * a required property going missing. (Both slots are effectively unreachable — the name is
 * always present when the SchemaType is — so only `replace` fires in practice.)
 */
export const createTypeNameClassifier = (dialect: DdlDiffDialect): ClassifyRule => {
  const replaceClassifier: DiffTypeClassifier = (ctx) =>
    breakingIf(!sameConsumptionFamily(ctx.before.parentContext?.value, ctx.after.parentContext?.value, dialect))
  return [nonBreaking, breaking, replaceClassifier]
}
