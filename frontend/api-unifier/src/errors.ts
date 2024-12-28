import { JSON_SCHEMA_PROPERTY_REF } from './rules/jsonschema.const'

export const ErrorMessage = {
  mergeError: () => 'Could not merge values, they are probably incompatible',
  mergeWithBrokenRef: () => 'Could not merge values with unresolved ref',
  ruleNotFound: (key: any) => `Merge rule not found for key: ${key}`,
  richRefObjectNotAllowed: () => `${JSON_SCHEMA_PROPERTY_REF} can't have siblings in this specification version`,
  refNotFound: (ref: string) => `${JSON_SCHEMA_PROPERTY_REF} can't be resolved: ${ref}`,
  refNotValidFormat: (ref: string) => `${JSON_SCHEMA_PROPERTY_REF} can't be parsed: ${ref}`,
} as const
