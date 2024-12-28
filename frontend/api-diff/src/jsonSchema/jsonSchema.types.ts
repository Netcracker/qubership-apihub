import type { CompareRules, InternalCompareOptions, StrictCompareOptions } from '../types'
import { JsonSchemaSpecVersion, OriginLeafs } from '@netcracker/qubership-apihub-api-unifier'

export type JsonSchemaRulesOptions = {
  version: JsonSchemaSpecVersion
  additionalRules: CompareRules
}

export type JsonSchemaCompareOptions = StrictCompareOptions & Omit<JsonSchemaRulesOptions, 'version'>

export type NativeAnySchemaFactory = (schema: Record<PropertyKey, unknown>, schemaOrigins: OriginLeafs | undefined, opt: InternalCompareOptions) => Record<PropertyKey, unknown>
