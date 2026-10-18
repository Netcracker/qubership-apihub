import { isArray } from '../utils'
import type { AdapterContext } from '../types'
import {
  cleanOrigins,
  copyOrigins,
  JSON_SCHEMA_PROPERTY_ANY_OF,
  JSON_SCHEMA_PROPERTY_ONE_OF,
  JSON_SCHEMA_PROPERTY_TYPE,
  setOrigins,
} from '@netcracker/qubership-apihub-api-unifier'
import { NativeAnySchemaFactory } from './jsonSchema.types'

type CombinerPropertyKey = typeof JSON_SCHEMA_PROPERTY_ONE_OF | typeof JSON_SCHEMA_PROPERTY_ANY_OF

export const unwrapAnyType = (value: Record<PropertyKey, unknown>, combiner: CombinerPropertyKey, ctx: AdapterContext<Record<PropertyKey, unknown>>, nativeAnyFactory: NativeAnySchemaFactory): Record<PropertyKey, unknown> => {
  switch (combiner) {
    case JSON_SCHEMA_PROPERTY_ANY_OF: {
      return ctx.transformer(value, combiner, value => {
        return nativeAnyFactory(value, ctx.valueOrigins, ctx.options)
      })
    }
    case JSON_SCHEMA_PROPERTY_ONE_OF: {
      ctx.options.onUnifyError?.('Not Implemented case when anyOf compare with oneOf', ['todo'], value)
      return value
    }
  }
}

export const unwrapNothingType = (value: Record<PropertyKey, unknown>, combiner: CombinerPropertyKey, ctx: AdapterContext<Record<PropertyKey, unknown>>): Record<PropertyKey, unknown> => {
  return ctx.transformer(value, combiner, (value) => {
    const { type, ...copyWithoutType } = value
    copyWithoutType[combiner] = []
    copyOrigins(value, copyWithoutType, JSON_SCHEMA_PROPERTY_TYPE, combiner, ctx.options.originsFlag)
    cleanOrigins(copyWithoutType, JSON_SCHEMA_PROPERTY_TYPE, ctx.options.originsFlag)
    return copyWithoutType
  })
}

export const wrapBySingletonCombiner = (value: Record<PropertyKey, unknown>, combiner: CombinerPropertyKey, ctx: AdapterContext<Record<PropertyKey, unknown>>): Record<PropertyKey, unknown> => {
  //todo need support case when there are properties near wrapped combiner (cases with change specific type to any type)
  if (isArray(value)) {
    ctx.options.onUnifyError?.('Not Implemented case when anyOf compare with oneOf', ['todo'], value)
    return value
  }
  return ctx.transformer(value, combiner, value => {
    const combinerValues = [value]
    const valueCopy = { [combiner]: combinerValues }
    setOrigins(valueCopy, combiner, ctx.options.originsFlag, ctx.valueOrigins)
    setOrigins(combinerValues, 0, ctx.options.originsFlag, ctx.valueOrigins)
    return valueCopy
  })
}
