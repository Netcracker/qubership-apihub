import { useMutation } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import type { IsError, IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { usePromoteVersionPublicationOptions } from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import { publishSnapshot } from '@agents/entities/snapshots'
import type { PublishConfig } from '@agents/entities/publish-config'
import { toPublishConfig } from '@agents/entities/publish-config'
import type { ServiceKey, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { v4 as uuidv4 } from 'uuid'
import {
  useGetAgentPrefix,
} from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'

export function usePromoteVersion(): [PromoteVersion, IsLoading, IsSuccess, IsError, Error | null] {
  const { agentId, namespaceKey } = useParams()
  const workspaceKey = useSearchParam(WORKSPACE_SEARCH_PARAM)
  const { setPromotePublicationOptions } = usePromoteVersionPublicationOptions()
  const prefix = useGetAgentPrefix()

  const { mutate, isLoading, isSuccess, isError, error } = useMutation<PublishConfig, Error, PromoteVersionOptions>({
    mutationFn: async ({ version, previousVersion, status, serviceKeys }) => {
      const builderId = uuidv4()

      const config = await publishSnapshot(
        agentId!,
        namespaceKey!,
        workspaceKey!,
        true,
        true,
        version,
        previousVersion,
        serviceKeys,
        builderId,
        prefix,
        status,
      )

      return toPublishConfig(config, builderId)
    },
    onSuccess: (config, { version, previousVersion, status, serviceKeys }) => {
      setPromotePublicationOptions({ version, previousVersion, status, serviceKeys, config })
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

export type PromoteVersion = (options: PromoteVersionOptions) => void

type PromoteVersionOptions = {
  version: VersionKey
  previousVersion: VersionKey
  serviceKeys: ServiceKey[]
  status: VersionStatus
}
