import {
  cleanOrigins,
  copyOrigins,
  JSON_SCHEMA_PROPERTY_MINIMUM,
  JSON_SCHEMA_PROPERTY_MAXIMUM,
  JSON_SCHEMA_PROPERTY_EXCLUSIVE_MINIMUM,
  JSON_SCHEMA_PROPERTY_EXCLUSIVE_MAXIMUM,
  JsonSchemaNumericValidationKeywordsType,
} from '@netcracker/qubership-apihub-api-unifier'
import { isNumber, isObject } from '../utils'
import { AdapterResolver, ClassifyRule } from '../types'
import { CompareContext, DiffType } from '../types'
import { breaking, nonBreaking, risky } from '../core'

const hasBooleanExclusiveBounds = (value: Record<PropertyKey, unknown>): boolean =>
  typeof value[JSON_SCHEMA_PROPERTY_EXCLUSIVE_MINIMUM] === 'boolean' ||
  typeof value[JSON_SCHEMA_PROPERTY_EXCLUSIVE_MAXIMUM] === 'boolean'

const adaptBooleanExclusiveBound = (
  value: Record<PropertyKey, unknown>,
  boundaryKey: typeof JSON_SCHEMA_PROPERTY_MINIMUM | typeof JSON_SCHEMA_PROPERTY_MAXIMUM,
  exclusiveKey: typeof JSON_SCHEMA_PROPERTY_EXCLUSIVE_MINIMUM | typeof JSON_SCHEMA_PROPERTY_EXCLUSIVE_MAXIMUM,
  originsFlag: symbol,
): void => {
  const exclusive = value[exclusiveKey]
  if (typeof exclusive !== 'boolean') {
    return
  }

  const boundary = value[boundaryKey]
  if (exclusive && isNumber(boundary)) {
    value[exclusiveKey] = boundary
    copyOrigins(value, value, boundaryKey, exclusiveKey, originsFlag)
    delete value[boundaryKey]
    cleanOrigins(value, boundaryKey, originsFlag)
    return
  }

  delete value[exclusiveKey]
  cleanOrigins(value, exclusiveKey, originsFlag)
}

export const booleanExclusiveBoundsOas30to31Adapter: AdapterResolver = (value, _reference, valueContext) => {
  if (!isObject(value) || !hasBooleanExclusiveBounds(value)) {
    return value
  }

  const { originsFlag } = valueContext.options

  return valueContext.transformer(value, 'boolean-exclusive-bounds-to-numeric', (current) => {
    if (!isObject(current)) {
      return current
    }

    const result = { ...current }
    adaptBooleanExclusiveBound(result, JSON_SCHEMA_PROPERTY_MINIMUM, JSON_SCHEMA_PROPERTY_EXCLUSIVE_MINIMUM, originsFlag)
    adaptBooleanExclusiveBound(result, JSON_SCHEMA_PROPERTY_MAXIMUM, JSON_SCHEMA_PROPERTY_EXCLUSIVE_MAXIMUM, originsFlag)
    return result
  })
}

type EffectiveBound = {
  propertyName: JsonSchemaNumericValidationKeywordsType
  value: number
  exclusive: boolean
}

const getNumericProperty = (schema: unknown, property: string): number | undefined => {
  if (!isObject(schema)) {
    return undefined
  }
  const value = schema[property]
  return isNumber(value) ? value : undefined
}

const getEffectiveLowerBound = (schema: unknown): EffectiveBound | undefined => {
  const minimumValue = getNumericProperty(schema, JSON_SCHEMA_PROPERTY_MINIMUM)
  const exclusiveMinimumValue = getNumericProperty(schema, JSON_SCHEMA_PROPERTY_EXCLUSIVE_MINIMUM)

  if (minimumValue === undefined && exclusiveMinimumValue === undefined) {
    return undefined
  }
  if (minimumValue === undefined) {
    return {
      propertyName: JSON_SCHEMA_PROPERTY_EXCLUSIVE_MINIMUM,
      value: exclusiveMinimumValue!,
      exclusive: true,
    }
  }
  if (exclusiveMinimumValue === undefined) {
    return {
      propertyName: JSON_SCHEMA_PROPERTY_MINIMUM,
      value: minimumValue,
      exclusive: false,
    }
  }

  if (exclusiveMinimumValue > minimumValue) {
    return {
      propertyName: JSON_SCHEMA_PROPERTY_EXCLUSIVE_MINIMUM,
      value: exclusiveMinimumValue,
      exclusive: true,
    }
  }
  if (exclusiveMinimumValue < minimumValue) {
    return {
      propertyName: JSON_SCHEMA_PROPERTY_MINIMUM,
      value: minimumValue,
      exclusive: false,
    }
  }
  return {
    propertyName: JSON_SCHEMA_PROPERTY_MINIMUM,
    value: minimumValue,
    exclusive: true,
  }
}

const getEffectiveUpperBound = (schema: unknown): EffectiveBound | undefined => {
  const maximumValue = getNumericProperty(schema, JSON_SCHEMA_PROPERTY_MAXIMUM)
  const exclusiveMaximumValue = getNumericProperty(schema, JSON_SCHEMA_PROPERTY_EXCLUSIVE_MAXIMUM)

  if (maximumValue === undefined && exclusiveMaximumValue === undefined) {
    return undefined
  }
  if (maximumValue === undefined) {
    return {
      propertyName: JSON_SCHEMA_PROPERTY_EXCLUSIVE_MAXIMUM,
      value: exclusiveMaximumValue!,
      exclusive: true,
    }
  }
  if (exclusiveMaximumValue === undefined) {
    return {
      propertyName: JSON_SCHEMA_PROPERTY_MAXIMUM,
      value: maximumValue,
      exclusive: false,
    }
  }

  if (exclusiveMaximumValue < maximumValue) {
    return {
      propertyName: JSON_SCHEMA_PROPERTY_EXCLUSIVE_MAXIMUM,
      value: exclusiveMaximumValue,
      exclusive: true,
    }
  }
  if (exclusiveMaximumValue > maximumValue) {
    return {
      propertyName: JSON_SCHEMA_PROPERTY_MAXIMUM,
      value: maximumValue,
      exclusive: false,
    }
  }
  return {
    propertyName: JSON_SCHEMA_PROPERTY_MAXIMUM,
    value: maximumValue,
    exclusive: true,
  }
}

const classifyByEffectiveBound = (
  ctx: CompareContext,
  getEffectiveBound: (schema: unknown) => EffectiveBound | undefined,
  isAfterStricter: (before: EffectiveBound, after: EffectiveBound) => boolean,
  stricterType: DiffType,
  looserType: DiffType,
): DiffType => {
  const beforeBound = getEffectiveBound(ctx.before.parent)
  const afterBound = getEffectiveBound(ctx.after.parent)

  if (!beforeBound) {
    return stricterType
  }
  if (!afterBound) {
    return looserType
  }
  if (beforeBound.value === afterBound.value && beforeBound.exclusive === afterBound.exclusive) {
    return nonBreaking
  }

  return isAfterStricter(beforeBound, afterBound) ? stricterType : looserType
}

const isAfterLowerStricter = (before: EffectiveBound, after: EffectiveBound) =>
  after.value > before.value || (after.value === before.value && after.exclusive && !before.exclusive)

const isAfterUpperStricter = (before: EffectiveBound, after: EffectiveBound) =>
  after.value < before.value || (after.value === before.value && after.exclusive && !before.exclusive)

const createPropertyBoundClassifier = (
  propertyName: JsonSchemaNumericValidationKeywordsType,
  getEffectiveBound: (schema: unknown) => EffectiveBound | undefined,
  isAfterStricter: (before: EffectiveBound, after: EffectiveBound) => boolean,
  stricterType: DiffType,
  looserType: DiffType,
) => (ctx: CompareContext): DiffType => {
  const definingBound = getEffectiveBound(ctx.after.parent) ?? getEffectiveBound(ctx.before.parent)
  if (!definingBound || definingBound.propertyName !== propertyName) return nonBreaking
  return classifyByEffectiveBound(ctx, getEffectiveBound, isAfterStricter, stricterType, looserType)
}

export const createEffectiveLowerBoundClassifier = (propertyName: JsonSchemaNumericValidationKeywordsType): ClassifyRule => {
  const requestClassifier = createPropertyBoundClassifier(propertyName, getEffectiveLowerBound, isAfterLowerStricter, breaking, nonBreaking)
  const responseClassifier = createPropertyBoundClassifier(propertyName, getEffectiveLowerBound, isAfterLowerStricter, nonBreaking, risky)
  return [requestClassifier, requestClassifier, requestClassifier, responseClassifier, responseClassifier, responseClassifier]
}

export const createEffectiveUpperBoundClassifier = (propertyName: JsonSchemaNumericValidationKeywordsType): ClassifyRule => {
  const requestClassifier = createPropertyBoundClassifier(propertyName, getEffectiveUpperBound, isAfterUpperStricter, breaking, nonBreaking)
  const responseClassifier = createPropertyBoundClassifier(propertyName, getEffectiveUpperBound, isAfterUpperStricter, nonBreaking, risky)
  return [requestClassifier, requestClassifier, requestClassifier, responseClassifier, responseClassifier, responseClassifier]
}

