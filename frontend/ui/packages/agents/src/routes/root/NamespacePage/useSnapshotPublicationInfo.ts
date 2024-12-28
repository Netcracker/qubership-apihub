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

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import type {
  SnapshotPublicationInfo,
  SnapshotPublicationInfoDto} from '@apihub/entities/snapshot-publication-info'
import {
  EMPTY_SNAPSHOT_PUBLICATION_INFO,
  getSnapshotPublicationInfo, toSnapshotPublicationInfo,
} from '@apihub/entities/snapshot-publication-info'
import type { InvalidateQuery, IsInitialLoading, IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { SnapshotKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import {
  useCreateSnapshotPublicationOptions,
} from './ServicesPage/ServicesPageProvider/ServicesPublicationOptionsProvider'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'

const SNAPSHOT_PUBLICATION_INFO_QUERY_KEY = 'snapshot-publish-info-query-key'

type SnapshotPublicationInfoQueryState = {
  snapshotPublicationInfo: SnapshotPublicationInfo
  isLoading: IsLoading
  isInitialLoading: IsInitialLoading
  isSuccess: IsSuccess
}

export function useSnapshotPublicationInfo(options?: {
  snapshotKey?: SnapshotKey
  promote?: boolean
}): SnapshotPublicationInfoQueryState {
  const { agentId, namespaceKey } = useParams()
  const workspaceKey = useSearchParam(WORKSPACE_SEARCH_PARAM)
  const { createSnapshotPublicationOptions: { name } } = useCreateSnapshotPublicationOptions()
  const snapshotKey = options?.snapshotKey ?? name
  const promotion = options?.promote ?? false

  const {
    data,
    isLoading,
    isInitialLoading,
    isSuccess,
  } = useQuery<SnapshotPublicationInfoDto, Error, SnapshotPublicationInfo>({
    queryKey: [SNAPSHOT_PUBLICATION_INFO_QUERY_KEY, namespaceKey, snapshotKey, promotion],
    queryFn: () => getSnapshotPublicationInfo(agentId!, namespaceKey!, workspaceKey!, snapshotKey!, promotion),
    enabled: !!namespaceKey && !!snapshotKey,
    select: toSnapshotPublicationInfo,
  })

  return {
    snapshotPublicationInfo: data ?? EMPTY_SNAPSHOT_PUBLICATION_INFO,
    isLoading: isLoading,
    isInitialLoading: isInitialLoading,
    isSuccess: isSuccess,
  }
}

export function useInvalidateSnapshotPublicationInfo(): InvalidateQuery<Partial<{
  snapshotPublicationName: string
}>> {
  const { namespaceKey } = useParams()
  const client = useQueryClient()

  return ({ snapshotPublicationName }) => client.invalidateQueries({
    queryKey: [SNAPSHOT_PUBLICATION_INFO_QUERY_KEY, namespaceKey, snapshotPublicationName],
    refetchType: 'all',
  })
}
