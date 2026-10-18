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

import { generatePath, useParams } from 'react-router-dom'
import JSZip from 'jszip'
import { useMemo } from 'react'
import { useShowErrorNotification } from './BasePage/Notification'
import { portalRequestBlob } from '@apihub/utils/requests'
import type { InvalidateQuery, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { getFileName } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { useVersionWithRevision } from '@apihub/routes/root/useVersionWithRevision'
import { useQuery, useQueryClient } from '@tanstack/react-query'

const VERSION_SOURCES_QUERY_KEY = 'version-sources-query-key'

export function useVersionSources(options: {
  enabled?: boolean
}): [File[], IsLoading] {
  const { enabled = true } = options
  const { packageId, versionId } = useParams()
  const showErrorNotification = useShowErrorNotification()

  const { fullVersion, isInitialLoading: isFullVersionLoading } = useVersionWithRevision(versionId, packageId)
  const { data, isInitialLoading } = useQuery<File[], Error>({
    queryKey: [VERSION_SOURCES_QUERY_KEY, packageId, fullVersion],
    queryFn: () => fetchSources(packageId!, fullVersion!),
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
    enabled: !!packageId && !!fullVersion && enabled,
  })

  return useMemo(
    () => [data ?? [], isInitialLoading || isFullVersionLoading],
    [data, isFullVersionLoading, isInitialLoading],
  )
}

export async function fetchSources(
  packageKey: Key,
  versionKey: Key,
): Promise<File[]> {
  const data = await fetchSourcesBlob(packageKey, versionKey)
  return data ? getSourcesFromZip(data) : []
}

export async function getSourcesFromZip(data: Blob): Promise<File[]> {
  const zip = new JSZip()
  const jsZip = await zip.loadAsync(data)
  return Promise.all(Object.values(jsZip.files)
    .filter(file => !file.dir)
    .map(async (file) => {
      const fileData = await file.async('blob')
      return new File([fileData], getFileName(file.name))
    }),
  )
}

export async function fetchSourcesBlob(
  packageKey: Key,
  versionKey: Key,
): Promise<Blob | null> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)

  const pathPattern = '/packages/:packageId/versions/:versionId/sources'
  const response = await portalRequestBlob(
    `${generatePath(pathPattern, { packageId, versionId })}`,
    {
      method: 'GET',
    },
  )
  return response.blob()
}

type InvalidateVersionSources = {
  packageKey: Key
  versionKey: Key
}

export function useAsyncInvalidateVersionSources(): (sources: InvalidateVersionSources) => Promise<void> {
  const client = useQueryClient()
  return ({ packageKey, versionKey }: InvalidateVersionSources) =>
    client.invalidateQueries({
      queryKey: [VERSION_SOURCES_QUERY_KEY, packageKey, versionKey],
    })
}

export function useInvalidateVersionSources(): InvalidateQuery<InvalidateVersionSources> {
  const client = useQueryClient()
  return ({ packageKey, versionKey }: InvalidateVersionSources) =>
    client.invalidateQueries({
      queryKey: [VERSION_SOURCES_QUERY_KEY, packageKey, versionKey],
    }).then()
}
