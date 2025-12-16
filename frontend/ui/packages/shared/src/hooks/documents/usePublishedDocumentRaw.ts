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
import type { IsLoading } from '../../utils/aliases'
import { toFormattedJsonString } from '../../utils/strings'
import { getPackageRedirectDetails } from '../../utils/redirects'
import type { Key } from '../../entities/keys'
import { API_V2, requestBlob } from '../../utils/requests'

export type FileContent = string

const PUBLISHED_DOCUMENT_RAW_QUERY_KEY = 'published-document-raw-query-key'

export function usePublishedDocumentRaw(options?: {
  packageKey?: Key
  versionKey?: Key
  slug: Key
  enabled?: boolean
  transform?: (value: string) => string
}): [FileContent, IsLoading] {
  const { packageId, versionId } = useParams()
  const packageKey = options?.packageKey ?? packageId
  const versionKey = options?.versionKey ?? versionId
  const slug = options?.slug
  const enabled = options?.enabled ?? true
  const transform = options?.transform ?? toFormattedJsonString

  const { data, isLoading } = useQuery<string, Error, string>({
    queryKey: [PUBLISHED_DOCUMENT_RAW_QUERY_KEY, packageKey, versionKey, slug],
    queryFn: () => getPublishedDocumentRaw(packageKey!, versionKey!, slug!),
    enabled: !!packageKey && !!versionKey && !!slug && enabled,
    select: transform,
  })

  return [data ?? '', isLoading]
}

export async function getPublishedDocumentRaw(
  packageKey: Key,
  versionKey: Key,
  slug: Key,
): Promise<FileContent> {
  const response = await getPublishedDocumentRawBlob(packageKey, versionKey, slug)
  return response.text()
}

export async function getPublishedDocumentRawBlob(
  packageKey: Key,
  versionKey: Key,
  slug: Key,
): Promise<Response> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const fileId = encodeURIComponent(slug)

  const pathPattern = '/packages/:packageId/versions/:versionId/files/:fileId/raw'
  return await requestBlob(
    generatePath(pathPattern, { packageId, versionId, fileId }),
    {
      method: 'get',
    },
    {
      basePath: API_V2,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
  )
}
