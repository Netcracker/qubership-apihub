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
import { generatePath, useParams } from 'react-router-dom'
import { portalRequestText } from '@apihub/utils/requests'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { FileContent } from '@apihub/entities/project-files'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { toFormattedJsonString } from '@netcracker/qubership-apihub-ui-shared/utils/strings'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'

const PUBLISHED_DOCUMENT_RAW_QUERY_KEY = 'published-document-raw-query-key'

export function usePublishedDocumentRaw(options?: {
  packageKey?: Key
  versionKey?: Key
  slug: Key
  enabled?: boolean
}): [FileContent, IsLoading] {
  const { packageId, versionId } = useParams()
  const packageKey = options?.packageKey ?? packageId
  const versionKey = options?.versionKey ?? versionId
  const slug = options?.slug
  const enabled = options?.enabled ?? true

  const { data, isLoading } = useQuery<string, Error, string>({
    queryKey: [PUBLISHED_DOCUMENT_RAW_QUERY_KEY, packageKey, versionKey, slug],
    queryFn: () => getPublishedDocumentRaw(packageKey!, versionKey!, slug!),
    enabled: !!packageKey && !!versionKey && !!slug && enabled,
    select: toFormattedJsonString,
  })

  return [data ?? '', isLoading]
}

export async function getPublishedDocumentRaw(
  packageKey: Key,
  versionKey: Key,
  slug: Key,
): Promise<FileContent> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const fileId = encodeURIComponent(slug)

  const pathPattern = '/packages/:packageId/versions/:versionId/files/:fileId/raw'
  return await portalRequestText(
    generatePath(pathPattern, { packageId, versionId, fileId }),
    {
      method: 'get',
    },
    {
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
  )
}
