export const OpenApiSectionIds = {
  // operation level (after the header rows: title, operation ID, address, description, external docs)
  SECURITY: 'security',
  OPERATION_EXTENSIONS: 'operationExtensions',
  REQUEST: 'request',
  RESPONSES: 'responses',
  // inside Request
  PATH_PARAMETERS: 'pathParameters',
  QUERY_PARAMETERS: 'queryParameters',
  HEADER_PARAMETERS: 'headerParameters',
  COOKIE_PARAMETERS: 'cookieParameters',
  REQUEST_BODY: 'requestBody',
  // inside Responses
  SELECTED_RESPONSE: 'selectedResponse',
  RESPONSES_EXTENSIONS: 'responsesExtensions',
  // inside the selected response
  RESPONSE_DESCRIPTION: 'responseDescription',
  RESPONSE_HEADERS: 'responseHeaders',
  RESPONSE_EXTENSIONS: 'responseExtensions',
  RESPONSE_BODY: 'responseBody',
} as const

export type OpenApiSectionId = typeof OpenApiSectionIds[keyof typeof OpenApiSectionIds]

type OperationSectionId = typeof OpenApiSectionIds.SECURITY | typeof OpenApiSectionIds.OPERATION_EXTENSIONS
  | typeof OpenApiSectionIds.REQUEST | typeof OpenApiSectionIds.RESPONSES
type RequestSectionId = typeof OpenApiSectionIds.PATH_PARAMETERS | typeof OpenApiSectionIds.QUERY_PARAMETERS
  | typeof OpenApiSectionIds.HEADER_PARAMETERS | typeof OpenApiSectionIds.COOKIE_PARAMETERS | typeof OpenApiSectionIds.REQUEST_BODY
type ResponsesSectionId = typeof OpenApiSectionIds.SELECTED_RESPONSE | typeof OpenApiSectionIds.RESPONSES_EXTENSIONS
type ResponseSectionId = typeof OpenApiSectionIds.RESPONSE_DESCRIPTION | typeof OpenApiSectionIds.RESPONSE_HEADERS
  | typeof OpenApiSectionIds.RESPONSE_EXTENSIONS | typeof OpenApiSectionIds.RESPONSE_BODY

/**
 * Order of every section the OpenAPI layer renders - the one place to reorder them
 * (docs/design/openapi/features/operation-viewer.md -> "Section order"). A section id stays in its own
 * list; nested JSON Schema / JSO viewers are out of scope.
 */
export const OPENAPI_SECTION_ORDER: {
  readonly operation: readonly OperationSectionId[]
  readonly request: readonly RequestSectionId[]
  readonly responses: readonly ResponsesSectionId[]
  readonly response: readonly ResponseSectionId[]
} = {
  operation: [OpenApiSectionIds.SECURITY, OpenApiSectionIds.OPERATION_EXTENSIONS, OpenApiSectionIds.REQUEST, OpenApiSectionIds.RESPONSES],
  request: [
    OpenApiSectionIds.PATH_PARAMETERS,
    OpenApiSectionIds.QUERY_PARAMETERS,
    OpenApiSectionIds.HEADER_PARAMETERS,
    OpenApiSectionIds.COOKIE_PARAMETERS,
    OpenApiSectionIds.REQUEST_BODY,
  ],
  responses: [OpenApiSectionIds.SELECTED_RESPONSE, OpenApiSectionIds.RESPONSES_EXTENSIONS],
  response: [
    OpenApiSectionIds.RESPONSE_DESCRIPTION,
    OpenApiSectionIds.RESPONSE_HEADERS,
    OpenApiSectionIds.RESPONSE_EXTENSIONS,
    OpenApiSectionIds.RESPONSE_BODY,
  ],
}

/** Allowed ids per list (the unit test checks each list is a permutation of these). */
export const OPENAPI_SECTION_IDS_BY_LEVEL: { readonly [K in keyof typeof OPENAPI_SECTION_ORDER]: readonly OpenApiSectionId[] } = {
  operation: [OpenApiSectionIds.SECURITY, OpenApiSectionIds.OPERATION_EXTENSIONS, OpenApiSectionIds.REQUEST, OpenApiSectionIds.RESPONSES],
  request: [
    OpenApiSectionIds.PATH_PARAMETERS,
    OpenApiSectionIds.QUERY_PARAMETERS,
    OpenApiSectionIds.HEADER_PARAMETERS,
    OpenApiSectionIds.COOKIE_PARAMETERS,
    OpenApiSectionIds.REQUEST_BODY,
  ],
  responses: [OpenApiSectionIds.SELECTED_RESPONSE, OpenApiSectionIds.RESPONSES_EXTENSIONS],
  response: [
    OpenApiSectionIds.RESPONSE_DESCRIPTION,
    OpenApiSectionIds.RESPONSE_HEADERS,
    OpenApiSectionIds.RESPONSE_EXTENSIONS,
    OpenApiSectionIds.RESPONSE_BODY,
  ],
}
