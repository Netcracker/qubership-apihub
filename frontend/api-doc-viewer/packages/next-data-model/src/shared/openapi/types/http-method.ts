export const OpenApiHttpMethods = {
  GET: 'get',
  PUT: 'put',
  POST: 'post',
  DELETE: 'delete',
  OPTIONS: 'options',
  HEAD: 'head',
  PATCH: 'patch',
  TRACE: 'trace',
} as const

export type OpenApiHttpMethod = typeof OpenApiHttpMethods[keyof typeof OpenApiHttpMethods]

/** Order used to pick the default method of a path item (same as `OPEN_API_HTTP_METHODS`). */
export const OPEN_API_HTTP_METHODS_ORDER: readonly OpenApiHttpMethod[] = Object.values(OpenApiHttpMethods)

export function isOpenApiHttpMethod(value: unknown): value is OpenApiHttpMethod {
  return typeof value === 'string' && OPEN_API_HTTP_METHODS_ORDER.some(method => method === value)
}
