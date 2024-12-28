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

export const PACKAGE_SEARCH_PARAM = 'package'
export const VERSION_SEARCH_PARAM = 'version'
export const OPERATION_SEARCH_PARAM = 'operation'
export const GROUP_SEARCH_PARAM = 'group'
export const WORKSPACE_SEARCH_PARAM = 'workspace'
export const TAG_SEARCH_PARAM = 'tag'
export const FILTERS_SEARCH_PARAM = 'filters'
export const EXPAND_NAVIGATION_MENU_SEARCH_PARAM = 'expandNavigationMenu'
export const FILE_VIEW_MODE_PARAM_KEY = 'fileViewMode'
export const REF_SEARCH_PARAM = 'ref'
export const DOCUMENT_SEARCH_PARAM = 'document'
export const MODE_SEARCH_PARAM = 'mode'
export const PLAYGROUND_SIDEBAR_VIEW_MODE_SEARCH_PARAM = 'sidebar'
export const API_TYPE_SEARCH_PARAM = 'apiType'
export const BRANCH_SEARCH_PARAM = 'branch'
export const VIEW_SEARCH_PARAM = 'view'
export const SEARCH_TEXT_PARAM_KEY = 'text'
export const OPERATIONS_VIEW_MODE_PARAM = 'viewMode'

export interface SearchParam {
  value: unknown
  toStringValue?: (value: object | string | number) => string
}

export function optionalSearchParams(
  params: Record<string, {
    value: unknown
    toStringValue?: (value: object | string | number) => string
  }>): URLSearchParams {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, { value, toStringValue }]) => {
    if (Array.isArray(value)) {
      const [first] = value
      if (!first) {
        return
      }
    }

    if (value || value === 0) {
      searchParams.set(key, toStringValue?.(value) ?? `${value}`)
    }
  })

  return searchParams
}
