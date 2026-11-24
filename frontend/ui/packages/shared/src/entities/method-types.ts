export const GET_METHOD_TYPE = 'get'
export const POST_METHOD_TYPE = 'post'
export const PUT_METHOD_TYPE = 'put'
export const PATCH_METHOD_TYPE = 'patch'
export const DELETE_METHOD_TYPE = 'delete'

export type MethodType =
  | typeof GET_METHOD_TYPE
  | typeof POST_METHOD_TYPE
  | typeof PUT_METHOD_TYPE
  | typeof PATCH_METHOD_TYPE
  | typeof DELETE_METHOD_TYPE

export const METHOD_TYPES: ReadonlySet<MethodType> = new Set([
  GET_METHOD_TYPE,
  POST_METHOD_TYPE,
  PUT_METHOD_TYPE,
  PATCH_METHOD_TYPE,
  DELETE_METHOD_TYPE,
])

export function isMethodType(method: string): method is MethodType {
  return (METHOD_TYPES as ReadonlySet<string>).has(method)
}

export const METHOD_TYPE_COLOR_MAP: Record<MethodType, string> = {
  [GET_METHOD_TYPE]: '#6BCE70',
  [POST_METHOD_TYPE]: '#5CB9CC',
  [PUT_METHOD_TYPE]: '#F49147',
  [PATCH_METHOD_TYPE]: '#FFB02E',
  [DELETE_METHOD_TYPE]: '#FF5260',
}
