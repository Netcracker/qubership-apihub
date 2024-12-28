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
import { useVersionWithRevision } from '../../useVersionWithRevision'
import { generatePath } from 'react-router-dom'
import type { Documents, DocumentsDto } from '@apihub/entities/documents'
import { toDocuments } from '@apihub/entities/documents'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { portalRequestJson } from '@apihub/utils/requests'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

const DOCUMENTS_QUERY_KEY = 'documents-query-key'

export type DocumentsQueryState = {
  documents: Documents
  isLoading: IsLoading
  isInitialLoading: IsLoading
}

export function useDocuments(options: Partial<{
  packageKey: Key
  versionKey: Key
  apiType: ApiType
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
    queryFn: ({ signal }) => getDocuments(packageKey!, fullVersion!, apiType!, signal),
    enabled: !!packageKey && !!fullVersion && enabled,
    select: toDocuments,
  })

  return {
    documents: data ?? [],
    isLoading: isLoading || isVersionLoading,
    isInitialLoading: isInitialLoading || isVersionInitialLoading,
  }
}

async function getDocuments(
  packageKey: Key,
  versionKey: Key,
  apiType?: ApiType,
  signal?: AbortSignal,
): Promise<DocumentsDto> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)

  const queryParams = optionalSearchParams({ apiType: { value: apiType } })
  const pathPattern = '/packages/:packageId/versions/:versionId/documents'
  return await portalRequestJson<DocumentsDto>(
    `${generatePath(pathPattern, { packageId, versionId })}?${queryParams}`,
    { method: 'get' },
    {
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
    signal,
  )
}
