// AsyncAPI 3.0 Property Constants

// Channel properties
export const ASYNCAPI_PROPERTY_ADDRESS = 'address'
export const ASYNCAPI_PROPERTY_MESSAGES = 'messages'
export const ASYNCAPI_PROPERTY_PARAMETERS = 'parameters'
export const ASYNCAPI_PROPERTY_SERVERS = 'servers'
export const ASYNCAPI_PROPERTY_BINDINGS = 'bindings'
export const ASYNCAPI_PROPERTY_TAGS = 'tags'

// Operation properties
export const ASYNCAPI_PROPERTY_ACTION = 'action'
export const ASYNCAPI_PROPERTY_CHANNEL = 'channel'
export const ASYNCAPI_PROPERTY_REPLY = 'reply'
export const ASYNCAPI_PROPERTY_TRAITS = 'traits'

// Message properties
export const ASYNCAPI_PROPERTY_PAYLOAD = 'payload'
export const ASYNCAPI_PROPERTY_HEADERS = 'headers'
export const ASYNCAPI_PROPERTY_CORRELATION_ID = 'correlationId'
export const ASYNCAPI_PROPERTY_CONTENT_TYPE = 'contentType'
export const ASYNCAPI_PROPERTY_NAME = 'name'
export const ASYNCAPI_PROPERTY_TITLE = 'title'
export const ASYNCAPI_PROPERTY_SUMMARY = 'summary'

// Server properties
export const ASYNCAPI_PROPERTY_HOST = 'host'
export const ASYNCAPI_PROPERTY_PROTOCOL = 'protocol'
export const ASYNCAPI_PROPERTY_PATHNAME = 'pathname'
export const ASYNCAPI_PROPERTY_DESCRIPTION = 'description'
export const ASYNCAPI_PROPERTY_VARIABLES = 'variables'
export const ASYNCAPI_PROPERTY_SECURITY = 'security'

// Component properties
export const ASYNCAPI_PROPERTY_SCHEMAS = 'schemas'
export const ASYNCAPI_PROPERTY_CHANNELS = 'channels'
export const ASYNCAPI_PROPERTY_OPERATIONS = 'operations'
export const ASYNCAPI_PROPERTY_SECURITY_SCHEMES = 'securitySchemes'
export const ASYNCAPI_PROPERTY_SERVER_VARIABLES = 'serverVariables'
export const ASYNCAPI_PROPERTY_CORRELATION_IDS = 'correlationIds'
export const ASYNCAPI_PROPERTY_REPLIES = 'replies'
export const ASYNCAPI_PROPERTY_REPLY_ADDRESSES = 'replyAddresses'
export const ASYNCAPI_PROPERTY_MESSAGE_TRAITS = 'messageTraits'
export const ASYNCAPI_PROPERTY_OPERATION_TRAITS = 'operationTraits'

// Root properties
export const ASYNCAPI_PROPERTY_ASYNCAPI = 'asyncapi'
export const ASYNCAPI_PROPERTY_INFO = 'info'
export const ASYNCAPI_PROPERTY_COMPONENTS = 'components'

// Info properties
export const ASYNCAPI_PROPERTY_VERSION = 'version'
export const ASYNCAPI_PROPERTY_CONTACT = 'contact'
export const ASYNCAPI_PROPERTY_LICENSE = 'license'
export const ASYNCAPI_PROPERTY_EXTERNAL_DOCS = 'externalDocs'

export const ASYNCAPI_PROPERTY_SERVER_BINDINGS = 'serverBindings'
export const ASYNCAPI_PROPERTY_CHANNEL_BINDINGS = 'channelBindings'
export const ASYNCAPI_PROPERTY_OPERATION_BINDINGS = 'operationBindings'
export const ASYNCAPI_PROPERTY_MESSAGE_BINDINGS = 'messageBindings'

// Action types
export const ASYNCAPI_ACTION_SEND = 'send'
export const ASYNCAPI_ACTION_RECEIVE = 'receive'

export type AsyncApiAction =
  typeof ASYNCAPI_ACTION_SEND
  | typeof ASYNCAPI_ACTION_RECEIVE

// Security scheme properties
export const ASYNCAPI_PROPERTY_SCOPES = 'scopes'
export const ASYNCAPI_PROPERTY_FLOWS = 'flows'

// Security scheme types
export const ASYNCAPI_SECURITY_SCHEME_TYPE_USER_PASSWORD = 'userPassword'
export const ASYNCAPI_SECURITY_SCHEME_TYPE_API_KEY = 'apiKey'
export const ASYNCAPI_SECURITY_SCHEME_TYPE_X509 = 'X509'
export const ASYNCAPI_SECURITY_SCHEME_TYPE_SYMMETRIC_ENCRYPTION = 'symmetricEncryption'
export const ASYNCAPI_SECURITY_SCHEME_TYPE_ASYMMETRIC_ENCRYPTION = 'asymmetricEncryption'
export const ASYNCAPI_SECURITY_SCHEME_TYPE_HTTP_API_KEY = 'httpApiKey'
export const ASYNCAPI_SECURITY_SCHEME_TYPE_HTTP = 'http'
export const ASYNCAPI_SECURITY_SCHEME_TYPE_OAUTH2 = 'oauth2'
export const ASYNCAPI_SECURITY_SCHEME_TYPE_OPEN_ID_CONNECT = 'openIdConnect'
export const ASYNCAPI_SECURITY_SCHEME_TYPE_PLAIN = 'plain'
export const ASYNCAPI_SECURITY_SCHEME_TYPE_SCRAM_SHA_256 = 'scramSha256'
export const ASYNCAPI_SECURITY_SCHEME_TYPE_SCRAM_SHA_512 = 'scramSha512'
export const ASYNCAPI_SECURITY_SCHEME_TYPE_GSSAPI = 'gssapi'

export type AsyncApiSecuritySchemeType =
  typeof ASYNCAPI_SECURITY_SCHEME_TYPE_USER_PASSWORD
  | typeof ASYNCAPI_SECURITY_SCHEME_TYPE_API_KEY
  | typeof ASYNCAPI_SECURITY_SCHEME_TYPE_X509
  | typeof ASYNCAPI_SECURITY_SCHEME_TYPE_SYMMETRIC_ENCRYPTION
  | typeof ASYNCAPI_SECURITY_SCHEME_TYPE_ASYMMETRIC_ENCRYPTION
  | typeof ASYNCAPI_SECURITY_SCHEME_TYPE_HTTP_API_KEY
  | typeof ASYNCAPI_SECURITY_SCHEME_TYPE_HTTP
  | typeof ASYNCAPI_SECURITY_SCHEME_TYPE_OAUTH2
  | typeof ASYNCAPI_SECURITY_SCHEME_TYPE_OPEN_ID_CONNECT
  | typeof ASYNCAPI_SECURITY_SCHEME_TYPE_PLAIN
  | typeof ASYNCAPI_SECURITY_SCHEME_TYPE_SCRAM_SHA_256
  | typeof ASYNCAPI_SECURITY_SCHEME_TYPE_SCRAM_SHA_512
  | typeof ASYNCAPI_SECURITY_SCHEME_TYPE_GSSAPI

export const ASYNCAPI_SECURITY_SCHEME_TYPES: readonly AsyncApiSecuritySchemeType[] = [
  ASYNCAPI_SECURITY_SCHEME_TYPE_USER_PASSWORD,
  ASYNCAPI_SECURITY_SCHEME_TYPE_API_KEY,
  ASYNCAPI_SECURITY_SCHEME_TYPE_X509,
  ASYNCAPI_SECURITY_SCHEME_TYPE_SYMMETRIC_ENCRYPTION,
  ASYNCAPI_SECURITY_SCHEME_TYPE_ASYMMETRIC_ENCRYPTION,
  ASYNCAPI_SECURITY_SCHEME_TYPE_HTTP_API_KEY,
  ASYNCAPI_SECURITY_SCHEME_TYPE_HTTP,
  ASYNCAPI_SECURITY_SCHEME_TYPE_OAUTH2,
  ASYNCAPI_SECURITY_SCHEME_TYPE_OPEN_ID_CONNECT,
  ASYNCAPI_SECURITY_SCHEME_TYPE_PLAIN,
  ASYNCAPI_SECURITY_SCHEME_TYPE_SCRAM_SHA_256,
  ASYNCAPI_SECURITY_SCHEME_TYPE_SCRAM_SHA_512,
  ASYNCAPI_SECURITY_SCHEME_TYPE_GSSAPI,
]

export const ASYNCAPI_PROPERTY_SCHEMA_FORMAT = 'schemaFormat'

// Common properties (also in JSON Schema)
export const ASYNCAPI_PROPERTY_DEPRECATED = 'deprecated'
export const ASYNCAPI_PROPERTY_EXAMPLE = 'example'
export const ASYNCAPI_PROPERTY_EXAMPLES = 'examples'
export const ASYNCAPI_PROPERTY_ENUM = 'enum'
export const ASYNCAPI_PROPERTY_DEFAULT = 'default'

// Schema format constants
export const ASYNCAPI_SCHEMA_FORMAT_DEFAULT = 'application/vnd.aai.asyncapi+json;version=3.0.0'

// Supported schema formats (normalized to lowercase for comparison)
// Include all variations: with/without +json suffix
export const ASYNCAPI_SCHEMA_FORMATS_ASCYNAPI_30 = [
  'application/vnd.aai.asyncapi;version=3.0.0',
  ASYNCAPI_SCHEMA_FORMAT_DEFAULT,
  'application/vnd.aai.asyncapi+yaml;version=3.0.0',
]

export const ASYNCAPI_SCHEMA_FORMATS_JSON = [
  'application/schema+json;version=draft-07',
  'application/schema+yaml;version=draft-07',
]

export const ASYNCAPI_SCHEMA_FORMATS_OPENAPI_30 = [
  'application/vnd.oai.openapi;version=3.0.0',
  'application/vnd.oai.openapi+json;version=3.0.0',
  'application/vnd.oai.openapi+yaml;version=3.0.0',
]
