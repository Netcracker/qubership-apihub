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

// Action types
export const ASYNCAPI_ACTION_SEND = 'send'
export const ASYNCAPI_ACTION_RECEIVE = 'receive'

export type AsyncApiAction =
  typeof ASYNCAPI_ACTION_SEND
  | typeof ASYNCAPI_ACTION_RECEIVE

// Common properties (also in JSON Schema)
export const ASYNCAPI_PROPERTY_DEPRECATED = 'deprecated'
export const ASYNCAPI_PROPERTY_EXAMPLE = 'example'
export const ASYNCAPI_PROPERTY_EXAMPLES = 'examples'
export const ASYNCAPI_PROPERTY_ENUM = 'enum'
export const ASYNCAPI_PROPERTY_DEFAULT = 'default'


