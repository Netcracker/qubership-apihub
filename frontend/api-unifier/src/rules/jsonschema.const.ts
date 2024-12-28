export const JSON_SCHEMA_NODE_TYPE_BOOLEAN = 'boolean'
export const JSON_SCHEMA_NODE_TYPE_OBJECT = 'object'
export const JSON_SCHEMA_NODE_TYPE_ARRAY = 'array'
export const JSON_SCHEMA_NODE_TYPE_NUMBER = 'number'
export const JSON_SCHEMA_NODE_TYPE_STRING = 'string'
export const JSON_SCHEMA_NODE_TYPE_INTEGER = 'integer'
export const JSON_SCHEMA_NODE_TYPE_NULL = 'null'

export const JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING = 'nothing'
export const JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY = 'any'

export const JSON_SCHEMA_NODE_TYPES: JsonSchemaNodeType[] = [
  JSON_SCHEMA_NODE_TYPE_BOOLEAN,
  JSON_SCHEMA_NODE_TYPE_STRING,
  JSON_SCHEMA_NODE_TYPE_NUMBER,
  JSON_SCHEMA_NODE_TYPE_INTEGER,
  JSON_SCHEMA_NODE_TYPE_OBJECT,
  JSON_SCHEMA_NODE_TYPE_ARRAY,
  JSON_SCHEMA_NODE_TYPE_NULL,
]

export const JSON_SCHEMA_NODE_SYNTHETIC_TYPES: (Exclude<JsonSchemaNodesNormalizedType, JsonSchemaNodeType>)[] = [
  JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING,
  JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY,
]

export const JSON_SCHEMA_NODE_NORMALIZED_TYPES: JsonSchemaNodesNormalizedType[] = [
  ...JSON_SCHEMA_NODE_TYPES,
  ...JSON_SCHEMA_NODE_SYNTHETIC_TYPES,
]

export type JsonSchemaNodeType =
  typeof JSON_SCHEMA_NODE_TYPE_BOOLEAN
  | typeof JSON_SCHEMA_NODE_TYPE_OBJECT
  | typeof JSON_SCHEMA_NODE_TYPE_ARRAY
  | typeof JSON_SCHEMA_NODE_TYPE_NUMBER
  | typeof JSON_SCHEMA_NODE_TYPE_STRING
  | typeof JSON_SCHEMA_NODE_TYPE_INTEGER
  | typeof JSON_SCHEMA_NODE_TYPE_NULL

export type JsonSchemaNodesNormalizedType =
  JsonSchemaNodeType
  | typeof JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING
  | typeof JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY

export type JsonSchemaCombinerType =
  typeof JSON_SCHEMA_PROPERTY_ONE_OF
  | typeof JSON_SCHEMA_PROPERTY_ANY_OF

export const JSON_SCHEMA_PROPERTY_TITLE = 'title'
export const JSON_SCHEMA_PROPERTY_CONTENT_MEDIA_TYPE = 'contentMediaType'
export const JSON_SCHEMA_PROPERTY_CONST = 'const'
export const JSON_SCHEMA_PROPERTY_PROPERTY_NAMES = 'propertyNames'
export const JSON_SCHEMA_PROPERTY_CONTAINS = 'contains'
export const JSON_SCHEMA_PROPERTY_DEPENDENCIES = 'dependencies'
export const JSON_SCHEMA_PROPERTY_DEFS = 'defs'
export const JSON_SCHEMA_PROPERTY_TYPE = 'type'
export const JSON_SCHEMA_PROPERTY_DESCRIPTION = 'description'
export const JSON_SCHEMA_PROPERTY_FORMAT = 'format'
export const JSON_SCHEMA_PROPERTY_DEFAULT = 'default'
export const JSON_SCHEMA_PROPERTY_MULTIPLE_OF = 'multipleOf'
export const JSON_SCHEMA_PROPERTY_MAXIMUM = 'maximum'
export const JSON_SCHEMA_PROPERTY_EXCLUSIVE_MAXIMUM = 'exclusiveMaximum'
export const JSON_SCHEMA_PROPERTY_MINIMUM = 'minimum'
export const JSON_SCHEMA_PROPERTY_EXCLUSIVE_MINIMUM = 'exclusiveMinimum'
export const JSON_SCHEMA_PROPERTY_MAX_LENGTH = 'maxLength'
export const JSON_SCHEMA_PROPERTY_MIN_LENGTH = 'minLength'
export const JSON_SCHEMA_PROPERTY_PATTERN = 'pattern'
export const JSON_SCHEMA_PROPERTY_MAX_ITEMS = 'maxItems'
export const JSON_SCHEMA_PROPERTY_MIN_ITEMS = 'minItems'
export const JSON_SCHEMA_PROPERTY_UNIQUE_ITEMS = 'uniqueItems'
export const JSON_SCHEMA_PROPERTY_MAX_PROPERTIES = 'maxProperties'
export const JSON_SCHEMA_PROPERTY_MIN_PROPERTIES = 'minProperties'
export const JSON_SCHEMA_PROPERTY_ITEMS = 'items'
export const JSON_SCHEMA_PROPERTY_ADDITIONAL_ITEMS = 'additionalItems'
export const JSON_SCHEMA_PROPERTY_REQUIRED = 'required'
export const JSON_SCHEMA_PROPERTY_ENUM = 'enum'
export const JSON_SCHEMA_PROPERTY_PROPERTIES = 'properties'
export const JSON_SCHEMA_PROPERTY_ADDITIONAL_PROPERTIES = 'additionalProperties'
export const JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES = 'patternProperties'
export const JSON_SCHEMA_PROPERTY_ALL_OF = 'allOf'
export const JSON_SCHEMA_PROPERTY_ONE_OF = 'oneOf'
export const JSON_SCHEMA_PROPERTY_ANY_OF = 'anyOf'
export const JSON_SCHEMA_PROPERTY_NOT = 'not'
export const JSON_SCHEMA_PROPERTY_NULLABLE = 'nullable'
export const JSON_SCHEMA_PROPERTY_READ_ONLY = 'readOnly'
export const JSON_SCHEMA_PROPERTY_WRITE_ONLY = 'writeOnly'
export const JSON_SCHEMA_PROPERTY_EXAMPLES = 'examples'
export const JSON_SCHEMA_PROPERTY_DEPRECATED = 'deprecated'
export const JSON_SCHEMA_PROPERTY_DEFINITIONS = 'definitions'
export const JSON_SCHEMA_PROPERTY_REF = '$ref'