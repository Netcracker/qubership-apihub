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

import type { MethodType } from '@shared/entities/operation'
import type { OperationsApiType } from '@shared/entities'
import type { PackageKind } from '@test-data/props'

export type PackageViewParams = {
  packageId: string
  name?: string
  kind?: PackageKind
}

export type PackageViewSettingsTabs =
  typeof SETTINGS_TAB_GENERAL |
  typeof SETTINGS_TAB_API_CONFIG |
  typeof SETTINGS_TAB_VERSIONS |
  typeof SETTINGS_TAB_TOKENS |
  typeof SETTINGS_TAB_USERS

export const SETTINGS_TAB_GENERAL = 'general'
export const SETTINGS_TAB_API_CONFIG = 'configuration'
export const SETTINGS_TAB_VERSIONS = 'versions'
export const SETTINGS_TAB_TOKENS = 'tokens'
export const SETTINGS_TAB_USERS = 'members'

export type VersionViewParams = {
  pkg: {
    packageId: string
    name?: string
  }
  version: string
}

export type VersionViewTabs =
  typeof VERSION_OVERVIEW_TAB_REVISION_HISTORY |
  typeof VERSION_OVERVIEW_TAB_GROUPS |
  typeof VERSION_OPERATIONS_TAB_REST |
  typeof VERSION_OPERATIONS_TAB_GQL |
  typeof VERSION_CHANGES_TAB_REST |
  typeof VERSION_CHANGES_TAB_GQL |
  typeof VERSION_DEPRECATED_TAB_REST |
  typeof VERSION_DEPRECATED_TAB_GQL |
  typeof VERSION_DOCUMENTS_TAB

export const VERSION_OVERVIEW_TAB_REVISION_HISTORY = 'overview/revision-history'
export const VERSION_OVERVIEW_TAB_GROUPS = 'overview/groups'
export const VERSION_OPERATIONS_TAB_REST = 'operations/rest'
export const VERSION_OPERATIONS_TAB_GQL = 'operations/graphql'
export const VERSION_CHANGES_TAB_REST = 'changes/rest'
export const VERSION_CHANGES_TAB_GQL = 'changes/graphql'
export const VERSION_DEPRECATED_TAB_REST = 'deprecated/rest'
export const VERSION_DEPRECATED_TAB_GQL = 'deprecated/graphql'
export const VERSION_DOCUMENTS_TAB = 'documents'

export type OperationViewParams = {
  operationId: string
  apiType: OperationsApiType
}

export type GetOperationWithMetaParams = {
  method: MethodType | string
  path?: string
  type?: string
  title?: string
}

export type GetOperationParams = {
  method: MethodType | string
  title: string
}
