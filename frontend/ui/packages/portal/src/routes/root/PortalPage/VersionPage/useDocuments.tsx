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

import { useQuery } from '@tanstack/react-query'

import type { Documents } from '@apihub/entities/documents'
import { toDocuments } from '@apihub/entities/documents'
import { useVersionWithRevision } from '../../useVersionWithRevision'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import {
  isContractType,
  type ContractType,
} from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { DocumentsDto } from '@netcracker/qubership-apihub-ui-shared/entities/documents'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { getResolvedVersionDocuments } from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'

export const DOCUMENTS_QUERY_KEY = 'documents-query-key'

export type DocumentsQueryState = {
  documents: Documents
  isLoading: IsLoading
  isInitialLoading: IsLoading
}

export function useDocuments(options: Partial<{
  packageKey: Key
  versionKey: Key
  apiType: ApiType | ContractType
  enabled: boolean
}>): DocumentsQueryState {
  const { packageKey, versionKey, apiType, enabled } = options
  const {
    fullVersion,
    isLoading: isVersionLoading,
    isInitialLoading: isVersionInitialLoading,
  } = useVersionWithRevision(versionKey, packageKey)

  const { data, isLoading, isInitialLoading } = useQuery<DocumentsDto, Error, Documents>({
    queryKey: [DOCUMENTS_QUERY_KEY, packageKey, fullVersion, apiType, enabled],
    queryFn: ({ signal }) => {
      if (!apiType) {
        return getResolvedVersionDocuments(packageKey!, fullVersion!, undefined, undefined, signal) as Promise<DocumentsDto>
      }
      return fetchDocumentsByApiType(packageKey!, fullVersion!, apiType, signal)
    },
    enabled: !!packageKey && !!fullVersion && enabled,
    select: toDocuments,
  })

  return {
    documents: data ?? [],
    isLoading: isLoading || isVersionLoading,
    isInitialLoading: isInitialLoading || isVersionInitialLoading,
  }
}

async function fetchDocumentsByApiType(
  packageKey: Key,
  versionKey: Key,
  apiType: ApiType | ContractType,
  signal?: AbortSignal,
): Promise<DocumentsDto> {
  if (isContractType(apiType)) {
    return getResolvedVersionDocuments(packageKey, versionKey, undefined, apiType, signal) as Promise<DocumentsDto>
  }
  return getResolvedVersionDocuments(packageKey, versionKey, apiType, undefined, signal) as Promise<DocumentsDto>
}
