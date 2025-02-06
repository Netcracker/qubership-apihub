export const OPENAPI_3_1_SPEC_TYPE = 'openapi-3-1'
export const OPENAPI_3_0_SPEC_TYPE = 'openapi-3-0'
export const OPENAPI_2_0_SPEC_TYPE = 'openapi-2-0'
export const OPENAPI_SPEC_TYPE = 'openapi'
export const ASYNCAPI_2_SPEC_TYPE = 'asyncapi-2'
export const JSON_SCHEMA_SPEC_TYPE = 'json-schema'
export const MARKDOWN_SPEC_TYPE = 'markdown'
export const UNKNOWN_SPEC_TYPE = 'unknown'
export const GRAPHQL_SPEC_TYPE = 'graphql'
export const GRAPHQL_SCHEMA_SPEC_TYPE = 'graphql-schema'
export const GRAPHAPI_SPEC_TYPE = 'graphapi'
export const GRAPHQL_INTROSPECTION_SPEC_TYPE = 'introspection'
export const PROTOBUF_3_SPEC_TYPE = 'protobuf-3'

export type SpecType =
  | typeof OPENAPI_3_1_SPEC_TYPE
  | typeof OPENAPI_3_0_SPEC_TYPE
  | typeof OPENAPI_2_0_SPEC_TYPE
  | typeof OPENAPI_SPEC_TYPE
  | typeof ASYNCAPI_2_SPEC_TYPE
  | typeof JSON_SCHEMA_SPEC_TYPE
  | typeof MARKDOWN_SPEC_TYPE
  | typeof UNKNOWN_SPEC_TYPE
  | typeof GRAPHQL_SPEC_TYPE
  | typeof GRAPHQL_SCHEMA_SPEC_TYPE
  | typeof GRAPHAPI_SPEC_TYPE
  | typeof GRAPHQL_INTROSPECTION_SPEC_TYPE
  | typeof PROTOBUF_3_SPEC_TYPE
