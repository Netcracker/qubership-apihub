import { ContentObject, HeadersObject, RequestBodyObject, ResponseObject } from 'openapi3-ts'

declare module 'openapi3-ts' {
  export interface CustomResponseObject extends ResponseObject {
    content?: ContentObject & Partial<Record<symbol, unknown>>;
    headers?: CustomHeadersObject;

    [metaKey: symbol]: unknown | undefined
  }

  export interface CustomRequestBodyObject extends RequestBodyObject {
    content: ContentObject & Partial<Record<symbol, unknown>>;
  }

  export interface CustomHeadersObject extends HeadersObject {
    [metaKey: symbol]: unknown | undefined
  }
}