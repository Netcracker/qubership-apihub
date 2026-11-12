import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { useInvalidateSnapshots } from '../../../useSnapshots'
import type { IsError, IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type {
  CreateSnapshotPublicationOptions,
} from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import {
  useCreateSnapshotPublicationOptions,
} from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import { publishSnapshot } from '@agents/entities/snapshots'
import type { PublishConfig } from '@agents/entities/publish-config'
import { toPublishConfig } from '@agents/entities/publish-config'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { v4 as uuidv4 } from 'uuid'
import {
  useGetAgentPrefix,
} from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'
import { removeDocumentErrorFileKeys } from '../useDocumentErrorFileKeys'

export function useCreateSnapshot(): [CreateSnapshot, IsLoading, IsSuccess, IsError, Error | null] {
  const { agentId, namespaceKey } = useParams()
  const workspaceKey = useSearchParam(WORKSPACE_SEARCH_PARAM)
  const { setCreateSnapshotPublicationOptions } = useCreateSnapshotPublicationOptions()
  const invalidateSnapshots = useInvalidateSnapshots()
  const prefix = useGetAgentPrefix()
  const client = useQueryClient()
  const {
    mutate,
    isLoading,
    isSuccess,
    isError,
    error,
  } = useMutation<PublishConfig, Error, CreateSnapshotPublicationOptions>({
    mutationFn: async ({ name, baseline, serviceKeys }) => {
      const builderId = uuidv4()

      const publishConfigDto = await publishSnapshot(
        agentId!,
        namespaceKey!,
        workspaceKey!,
        true,
        false,
        name,
        baseline,
        serviceKeys,
        builderId,
        prefix,
      )

      return toPublishConfig(publishConfigDto, builderId)
    },
    onSuccess: (config, { name, baseline, serviceKeys }) => {
      setCreateSnapshotPublicationOptions({ name, baseline, serviceKeys, config })
      removeDocumentErrorFileKeys(client, name)
      invalidateSnapshots()
    },
  })

  return [
    mutate,
    isLoading,
    isSuccess,
    isError,
    error,
  ]
}

export type CreateSnapshot = (options: CreateSnapshotPublicationOptions) => void
