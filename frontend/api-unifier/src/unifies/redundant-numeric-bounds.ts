import { isArray, isObject } from '@netcracker/qubership-apihub-json-crawl'
import { InternalUnifyOptions, TransformFunction, UnifyContext } from '../types'
import {
  JSON_SCHEMA_PROPERTY_EXCLUSIVE_MAXIMUM,
  JSON_SCHEMA_PROPERTY_EXCLUSIVE_MINIMUM,
  JSON_SCHEMA_PROPERTY_MAXIMUM,
  JSON_SCHEMA_PROPERTY_MINIMUM,
  JsonSchemaNumericValidationKeywordsType,
} from '../rules/jsonschema.const'
import { cleanOrigins } from '../origins'
import { isBroken, isPureCombiner } from './type'
import { isNumber } from '../utils'

function removeConstraint(
  jso: Record<PropertyKey, unknown>,
  propertyKey: JsonSchemaNumericValidationKeywordsType,
  ctx: UnifyContext<InternalUnifyOptions>,
): Record<PropertyKey, unknown> {
  delete jso[propertyKey]
  cleanOrigins(jso, propertyKey, ctx.options.originsFlag)
  return jso
}

export const unifyJsonSchemaExclusiveBounds: TransformFunction = (jso, ctx) => {
  if (!ctx.options.removeRedundantConstraints) {
    return jso
  }
  if (!isObject(jso) || isArray(jso)) {
    return jso
  }
  if (isPureCombiner(jso)) {
    return jso
  }
  if (isBroken(jso)) {
    return jso
  }

  let result: Record<PropertyKey, unknown> | null = null

  const minimum = jso[JSON_SCHEMA_PROPERTY_MINIMUM]
  const exclusiveMinimum = jso[JSON_SCHEMA_PROPERTY_EXCLUSIVE_MINIMUM]
  if (isNumber(minimum) && isNumber(exclusiveMinimum)) {
    result = removeConstraint(
      result ?? { ...jso },
      exclusiveMinimum >= minimum ? JSON_SCHEMA_PROPERTY_MINIMUM : JSON_SCHEMA_PROPERTY_EXCLUSIVE_MINIMUM,
      ctx,
    )
  }

  const maximum = (result ?? jso)[JSON_SCHEMA_PROPERTY_MAXIMUM]
  const exclusiveMaximum = (result ?? jso)[JSON_SCHEMA_PROPERTY_EXCLUSIVE_MAXIMUM]
  if (isNumber(maximum) && isNumber(exclusiveMaximum)) {
    result = removeConstraint(
      result ?? { ...jso },
      exclusiveMaximum <= maximum ? JSON_SCHEMA_PROPERTY_MAXIMUM : JSON_SCHEMA_PROPERTY_EXCLUSIVE_MAXIMUM,
      ctx,
    )
  }

  if (!result) {
    return jso
  }

  return result
}
