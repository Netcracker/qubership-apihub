export const OPEN_API_HTTP_METHOD_GET = 'get'
export const OPEN_API_HTTP_METHOD_POST = 'post'
export const OPEN_API_HTTP_METHOD_PUT = 'put'
export const OPEN_API_HTTP_METHOD_DELETE = 'delete'
export const OPEN_API_HTTP_METHOD_PATCH = 'patch'
export const OPEN_API_HTTP_METHOD_OPTIONS = 'options'
export const OPEN_API_HTTP_METHOD_HEAD = 'head'
export const OPEN_API_HTTP_METHOD_TRACE = 'trace'

export type OpenApiHttpMethod =
  typeof OPEN_API_HTTP_METHOD_GET
  | typeof OPEN_API_HTTP_METHOD_POST
  | typeof OPEN_API_HTTP_METHOD_PUT
  | typeof OPEN_API_HTTP_METHOD_DELETE
  | typeof OPEN_API_HTTP_METHOD_PATCH
  | typeof OPEN_API_HTTP_METHOD_OPTIONS
  | typeof OPEN_API_HTTP_METHOD_HEAD
  | typeof OPEN_API_HTTP_METHOD_TRACE

export const OPEN_API_HTTP_METHODS: OpenApiHttpMethod[] = [
  OPEN_API_HTTP_METHOD_GET,
  OPEN_API_HTTP_METHOD_POST,
  OPEN_API_HTTP_METHOD_PUT,
  OPEN_API_HTTP_METHOD_DELETE,
  OPEN_API_HTTP_METHOD_PATCH,
  OPEN_API_HTTP_METHOD_OPTIONS,
  OPEN_API_HTTP_METHOD_HEAD,
  OPEN_API_HTTP_METHOD_TRACE,
]

export const OPEN_API_PROPERTY_PARAMETERS = 'parameters'
export const OPEN_API_PROPERTY_TAGS = 'tags'
export const OPEN_API_PROPERTY_DEPRECATED = 'deprecated'
export const OPEN_API_PROPERTY_REQUIRED = 'required'
export const OPEN_API_PROPERTY_ALLOW_EMPTY_VALUE = 'allowEmptyValue'
export const OPEN_API_PROPERTY_ALLOW_RESERVED = 'allowReserved'
export const OPEN_API_PROPERTY_HEADERS = 'headers'
export const OPEN_API_PROPERTY_EXAMPLES = 'examples'
export const OPEN_API_PROPERTY_EXAMPLE = 'example'
export const OPEN_API_PROPERTY_VALUE = 'value'
export const OPEN_API_PROPERTY_COMPONENTS = 'components'
export const OPEN_API_PROPERTY_PATHS = 'paths'
export const OPEN_API_PROPERTY_RESPONSES = 'responses'
export const OPEN_API_PROPERTY_REQUEST_BODIES = 'requestBodies'
export const OPEN_API_PROPERTY_REQUEST_BODY = 'requestBody'
export const OPEN_API_PROPERTY_SCHEMAS = 'schemas'
export const OPEN_API_PROPERTY_SCHEMA = 'schema'
export const OPEN_API_PROPERTY_LINKS = 'links'
export const OPEN_API_PROPERTY_SECURITY_SCHEMAS = 'securitySchemes'

export const OPEN_API_PROPERTY_DESCRIPTION = 'description'
export const OPEN_API_PROPERTY_CONTENT = 'content'
export const OPEN_API_PROPERTY_ENCODING = 'encoding'
