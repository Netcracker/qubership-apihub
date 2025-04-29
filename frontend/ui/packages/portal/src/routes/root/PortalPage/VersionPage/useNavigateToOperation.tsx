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

import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { YAML_FILE_VIEW_MODE } from '@netcracker/qubership-apihub-ui-shared/entities/file-format-view'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { DOC_OPERATION_VIEW_MODE } from '@netcracker/qubership-apihub-ui-shared/entities/operation-view-mode'
import type { PackageRef } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { PackageKind } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import {
  DOCUMENT_SEARCH_PARAM,
  FILE_VIEW_MODE_PARAM_KEY,
  MODE_SEARCH_PARAM,
  OPERATION_SEARCH_PARAM,
  PLAYGROUND_SIDEBAR_VIEW_MODE_SEARCH_PARAM,
  REF_SEARCH_PARAM,
  SEARCH_TEXT_PARAM_KEY,
} from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import type { Path } from '@remix-run/router'
import type { Dispatch, SetStateAction } from 'react'
import { useCallback } from 'react'
import { getOperationsPath, useNavigation } from '../../../NavigationProvider'
import { useTextSearchParam } from '../../useTextSearchParam'
import { useDocumentSearchParam } from './useDocumentSearchParam'
import { useFileViewMode } from './useFileViewMode'
import { useOperationSearchParam } from './useOperationSearchParam'
import { useOperationViewMode } from './useOperationViewMode'
import { useSidebarPlaygroundViewMode } from './useSidebarPlaygroundViewMode'

export function useNavigateToOperation(packageKey: Key, versionKey: Key, apiType: ApiType, setShouldAutoExpand: Dispatch<SetStateAction<boolean>>): (operationKey: Key) => void {
  const { navigateToOperations } = useNavigation()

  const { mode } = useOperationViewMode()
  const [fileViewMode = YAML_FILE_VIEW_MODE] = useFileViewMode()
  const [playgroundViewMode = ''] = useSidebarPlaygroundViewMode()
  const ref = useSearchParam(REF_SEARCH_PARAM)
  const [documentSlug] = useDocumentSearchParam()
  const [searchValue] = useTextSearchParam()
  const [previousOperationKey] = useOperationSearchParam()

  return useCallback((operationKey: Key) => {
    setShouldAutoExpand(false)

    navigateToOperations({
      packageKey: packageKey!,
      versionKey: versionKey!,
      apiType: apiType,
      operationKey: operationKey,
      search: {
        [MODE_SEARCH_PARAM]: { value: mode !== DOC_OPERATION_VIEW_MODE ? mode : '' },
        [FILE_VIEW_MODE_PARAM_KEY]: { value: fileViewMode !== YAML_FILE_VIEW_MODE ? fileViewMode : '' },
        [REF_SEARCH_PARAM]: { value: ref ?? '' },
        [PLAYGROUND_SIDEBAR_VIEW_MODE_SEARCH_PARAM]: { value: playgroundViewMode ?? '' },
        [DOCUMENT_SEARCH_PARAM]: { value: documentSlug },
        [SEARCH_TEXT_PARAM_KEY]: { value: searchValue },
        [OPERATION_SEARCH_PARAM]: { value: previousOperationKey },
      },
    })
  }, [apiType, documentSlug, fileViewMode, mode, navigateToOperations, packageKey, playgroundViewMode, ref, searchValue, setShouldAutoExpand, versionKey, previousOperationKey])
}

export function getOperationLink(params: {
  packageKey: Key
  versionKey: Key
  operationKey: Key
  apiType?: ApiType
  kind?: PackageKind
  mode: string
  fileViewMode: string | undefined
  playgroundViewMode: string | undefined
  packageRef?: PackageRef
  documentSlug?: Key
  ref?: Key
}): Partial<Path> {
  const {
    packageKey, versionKey, operationKey,
    apiType, packageRef, ref,
    mode, playgroundViewMode, fileViewMode, kind, documentSlug,
  } = params

  return getOperationsPath({
    packageKey: packageKey!,
    versionKey: versionKey!,
    apiType: apiType ?? DEFAULT_API_TYPE,
    operationKey: operationKey,
    search: {
      [MODE_SEARCH_PARAM]: { value: mode !== DOC_OPERATION_VIEW_MODE ? mode : '' },
      [FILE_VIEW_MODE_PARAM_KEY]: { value: fileViewMode !== YAML_FILE_VIEW_MODE ? fileViewMode : '' },
      [REF_SEARCH_PARAM]: { value: kind === DASHBOARD_KIND && (packageRef || ref) ? (packageRef?.key ?? ref!) : '' },
      [PLAYGROUND_SIDEBAR_VIEW_MODE_SEARCH_PARAM]: { value: playgroundViewMode ?? '' },
      [DOCUMENT_SEARCH_PARAM]: { value: documentSlug },
    },
  })
}

