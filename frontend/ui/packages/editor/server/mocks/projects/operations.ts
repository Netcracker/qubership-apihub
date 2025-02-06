export const ADD_OPERATION = 'add'
export const PATCH_OPERATION = 'patch'
export const REMOVE_OPERATION = 'remove'

export type Operation =
  | typeof ADD_OPERATION
  | typeof PATCH_OPERATION
  | typeof REMOVE_OPERATION
