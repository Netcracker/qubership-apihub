/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
  apiType?: ApiType
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
