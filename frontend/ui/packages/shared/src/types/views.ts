import type { Key } from '../entities/keys'

export const LIST_OPERATIONS_VIEW_MODE = 'list'
export const DETAILED_OPERATIONS_VIEW_MODE = 'detailed'

export const OPERATIONS_VIEW_MODES = [LIST_OPERATIONS_VIEW_MODE, DETAILED_OPERATIONS_VIEW_MODE] as const

export type OperationsViewMode = Key
