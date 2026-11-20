import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import type {
  SnapshotPublicationInfo,
  SnapshotPublicationInfoDto,
} from '@agents/entities/snapshot-publication-info'
import {
  EMPTY_SNAPSHOT_PUBLICATION_INFO,
  getSnapshotPublicationInfo, toSnapshotPublicationInfo,
} from '@agents/entities/snapshot-publication-info'
import type {
  InvalidateQuery,
  IsInitialLoading,
  IsLoading,
  IsSuccess,
} from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { SnapshotKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import {
  useCreateSnapshotPublicationOptions,
} from './ServicesPage/ServicesPageProvider/ServicesPublicationOptionsProvider'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import {
  useGetAgentPrefix,
} from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'

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
  const prefix = useGetAgentPrefix()
  const {
    data,
    isLoading,
    isInitialLoading,
    isSuccess,
  } = useQuery<SnapshotPublicationInfoDto, Error, SnapshotPublicationInfo>({
    queryKey: [SNAPSHOT_PUBLICATION_INFO_QUERY_KEY, namespaceKey, snapshotKey, promotion],
    queryFn: () => getSnapshotPublicationInfo(agentId!, namespaceKey!, workspaceKey!, snapshotKey!, promotion, prefix),
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
