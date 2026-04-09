export const JsoPropertyValueTypes = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  NULL: 'null',
  OBJECT: 'object',
  ARRAY: 'array',
  JSON_SCHEMA: 'jsonSchema',
  MULTI_SCHEMA: 'multiSchema',
  UNKNOWN: 'unknown',
} as const

export type JsoPropertyValueType = typeof JsoPropertyValueTypes[keyof typeof JsoPropertyValueTypes]

export const JsoPropertyValueTypesList = Object.values(JsoPropertyValueTypes)
