export const SEND_OPERATION_TYPE = 'send'
export const RECEIVE_OPERATION_TYPE = 'receive'

export type AsyncApiOperationType =
  | typeof SEND_OPERATION_TYPE
  | typeof RECEIVE_OPERATION_TYPE

export const ASYNCAPI_OPERATION_TYPE_COLOR_MAP: Record<AsyncApiOperationType, string> = {
  [SEND_OPERATION_TYPE]: '#5CB9CC',
  [RECEIVE_OPERATION_TYPE]: '#6BCE70',
}
