import { InternalMergeOptions, JsonSchema, ValueWithOrigins } from '../types'
import { JSON_SCHEMA_PROPERTY_TITLE } from '../rules/jsonschema.const'

import { resolveOrigins } from '../origins'

export interface RichTitle {
  readonly title: string;
  readonly synthetic: boolean;
}

export const prepareTitleForMerge = (itemWithOrigins: ValueWithOrigins<JsonSchema>[], syntheticPropertyKey: PropertyKey, options: InternalMergeOptions): ValueWithOrigins<RichTitle>[] => {
  const richTitles: ValueWithOrigins<RichTitle>[] = []

  for (const schemaWithOrigins of itemWithOrigins) {
    const schema = schemaWithOrigins.value
    if (!(JSON_SCHEMA_PROPERTY_TITLE in schema)) { continue }
    if (typeof schema[JSON_SCHEMA_PROPERTY_TITLE] !== 'string') { continue }
    richTitles.push({
      value: {
        title: schema[JSON_SCHEMA_PROPERTY_TITLE],
        synthetic: syntheticPropertyKey in schema && !!schema[syntheticPropertyKey],
      },
      origins: resolveOrigins(schema, JSON_SCHEMA_PROPERTY_TITLE, options.originsFlag) ?? [],
    })
  }
  return richTitles
}