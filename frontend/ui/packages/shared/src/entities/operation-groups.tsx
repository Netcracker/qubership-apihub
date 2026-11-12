import type { ApiType } from './api-types'

export type OperationGroupDto = Readonly<{
  groupName: string
  description?: string
  isPrefixGroup: boolean
  exportTemplateFileName?: string
  operationsCount?: number
}>
export type OperationGroupWithApiTypeDto = OperationGroupDto & { apiType: ApiType }

export type CreateOperationGroupDto = Readonly<{
  groupName: string
  description?: string
  template?: File
}>

export type UpdateOperationGroupDto = CreateOperationGroupDto

export type OperationGroup = Readonly<{
  groupName: string
  description: string
  isPrefixGroup: boolean
  exportTemplateFileName?: string
  operationsCount: number
  apiType: ApiType
  template?: File
}>

export function toCreateOperationGroupDto(
  groupName: string,
  description?: string,
  template?: File,
): CreateOperationGroupDto {
  return {
    groupName,
    description,
    template,
  }
}

export const toUpdateOperationGroupDto = toCreateOperationGroupDto

export type OperationGroupName = string

export const ALL_OPERATION_GROUPS = 'All'
export const UNGROUPED_OPERATION_GROUP = 'Ungrouped'

export function isSyntheticGroup(groupName?: OperationGroupName): boolean {
  return !!groupName && [ALL_OPERATION_GROUPS, UNGROUPED_OPERATION_GROUP].includes(groupName)
}

export const DISABLED_BUTTON_COLOR = '#B4BFCF'
export const ENABLED_BUTTON_COLOR = '#626D82'

export const GROUP_TYPE_REST_PATH_PREFIX = 'REST Path Prefix'
export const GROUP_TYPE_MANUAL = 'Manual'
