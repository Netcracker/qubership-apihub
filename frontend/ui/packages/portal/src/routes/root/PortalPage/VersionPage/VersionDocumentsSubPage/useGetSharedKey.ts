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
import type { Key } from '@apihub/entities/keys'
import { useParams } from 'react-router-dom'
import type { RefetchQuery } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { portalRequestJson } from '@apihub/utils/requests'

const SHARED_KEY_QUERY_KEY = 'shared-key-query-key'

export function useGetSharedKey(slug: string, refPackageKey: string | undefined): RefetchQuery<string, Error> {
  const { packageId, versionId } = useParams()
  const packageKey = refPackageKey ?? packageId
  const { refetch } = useQuery<string, Error, string>({
    queryKey: [SHARED_KEY_QUERY_KEY, packageKey, versionId, slug],
    queryFn: () => getSharedKey(packageKey!, versionId!, slug!),
    enabled: false,
  })

  return refetch
}

async function getSharedKey(
  packageKey: Key,
  versionKey: Key,
  fileKey: Key,
): Promise<string> {
  const packageId = encodeURIComponent(packageKey)
  const fileId = encodeURIComponent(fileKey)

  const data = await portalRequestJson<SharedIdType>(
    '/sharedFiles',
    {
      method: 'post',
      body: JSON.stringify({
        packageId: packageId,
        version: versionKey,
        slug: fileId,
      }),
    },
  )
  const { sharedFileId } = data

  return sharedFileId
}

type SharedIdType = {
  sharedFileId: string
}
