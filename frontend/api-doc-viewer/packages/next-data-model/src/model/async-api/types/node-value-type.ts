export const AsyncApiNodeJsoPropertyValueTypes = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  OBJECT: 'object',
  ARRAY: 'array',
  JSON_SCHEMA: 'jsonSchema',
  MULTI_SCHEMA: 'multiSchema',
  UNKNOWN: 'unknown',
} as const

export type AsyncApiNodeJsoPropertyValueType = typeof AsyncApiNodeJsoPropertyValueTypes[keyof typeof AsyncApiNodeJsoPropertyValueTypes]
