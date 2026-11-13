import { SecurityTreeNodeKinds } from "../../security/types/node-kind"

export const OpenApiTreeNodeKinds = {
  OPERATION: 'operation',
  // The Security section's kinds (shared with AsyncAPI).
  ...SecurityTreeNodeKinds,
  EXTENSIONS: 'extensions',
  REQUEST: 'request',
  PARAMETERS: 'parameters',
  REQUEST_BODY: 'requestBody',
  CONTENT: 'content',
  MEDIA_TYPE: 'mediaType',
  RESPONSES: 'responses',
  RESPONSE: 'response',
  RESPONSE_HEADERS: 'responseHeaders',
} as const

export type OpenApiTreeNodeKind = typeof OpenApiTreeNodeKinds[keyof typeof OpenApiTreeNodeKinds]

export const OpenApiTreeNodeKindsList: OpenApiTreeNodeKind[] = Object.values(OpenApiTreeNodeKinds)

export function isOpenApiTreeNodeKind(kind: string): kind is OpenApiTreeNodeKind {
  return OpenApiTreeNodeKindsList.some(openApiKind => openApiKind === kind)
}
