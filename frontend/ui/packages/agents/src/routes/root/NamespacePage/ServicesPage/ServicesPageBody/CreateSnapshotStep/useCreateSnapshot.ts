import {
  type MutationKey,
  type QueryClient,
  useIsMutating,
  useMutation,
  type UseMutationOptions,
  useQueryClient,
} from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

import {
  useGetAgentPrefix,
} from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import type { InvalidateQuery } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

import type { AgentKey, NamespaceKey, WorkspaceKey } from '@agents/entities/keys'
import { toPublishConfig } from '@agents/entities/publish-config'
import { publishSnapshot } from '@agents/entities/snapshots'
import { useInvalidateSnapshots } from '../../../useSnapshots'
import type {
  CreateSnapshotPublicationOptions,
  SnapshotPublication,
} from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import { removeDocumentErrorFileKeys } from '../useDocumentErrorFileKeys'

const CREATE_SNAPSHOT_MUTATION_KEY = 'create-snapshot-mutation-key'

export type CreateSnapshot = (options: CreateSnapshotPublicationOptions) => void

type CreateSnapshotActions = Readonly<{
  onCreated: (snapshotPublication: SnapshotPublication) => void
  onFailed: (options: CreateSnapshotPublicationOptions) => void
}>

type CreateSnapshotTarget = Readonly<{
  agentId: AgentKey | undefined
  namespaceKey: NamespaceKey | undefined
  workspaceKey: WorkspaceKey | undefined
}>

export function useCreateSnapshot(actions: CreateSnapshotActions): CreateSnapshot {
  const target = useCreateSnapshotTarget()
  const prefix = useGetAgentPrefix()
  const client = useQueryClient()
  const invalidateSnapshots = useInvalidateSnapshots()
  const options = getCreateSnapshotMutationOptions(target, prefix, client, invalidateSnapshots)

  const { mutate } = useMutation({
    ...options,
    // The mutation runs these callbacks also after the step unmounts, so a snapshot created after "Back" still gets
    // its section
    onSuccess: (snapshotPublication, variables, context) => {
      options.onSuccess?.(snapshotPublication, variables, context)
      actions.onCreated(snapshotPublication)
    },
    onError: (_error, variables) => actions.onFailed(variables),
  })

  return mutate
}

/** Whether a create request of the open namespace and workspace runs, whichever step sent it. */
export function useIsCreatingSnapshot(): boolean {
  return useIsMutating({ mutationKey: getCreateSnapshotMutationKey(useCreateSnapshotTarget()) }) > 0
}

function useCreateSnapshotTarget(): CreateSnapshotTarget {
  const { agentId, namespaceKey } = useParams()
  const workspaceKey = useSearchParam(WORKSPACE_SEARCH_PARAM)
  return { agentId: agentId, namespaceKey: namespaceKey, workspaceKey: workspaceKey }
}

function getCreateSnapshotMutationOptions(
  target: CreateSnapshotTarget,
  prefix: string,
  client: QueryClient,
  invalidateSnapshots: InvalidateQuery<void>,
): UseMutationOptions<SnapshotPublication, Error, CreateSnapshotPublicationOptions> {
  const { agentId, namespaceKey, workspaceKey } = target
  return {
    mutationKey: getCreateSnapshotMutationKey(target),
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
      return { name: name, baseline: baseline, config: toPublishConfig(publishConfigDto, builderId) }
    },
    onSuccess: (_snapshotPublication, { name }) => {
      removeDocumentErrorFileKeys(client, name)
      invalidateSnapshots()
    },
  }
}

function getCreateSnapshotMutationKey({ agentId, namespaceKey, workspaceKey }: CreateSnapshotTarget): MutationKey {
  return [CREATE_SNAPSHOT_MUTATION_KEY, agentId, namespaceKey, workspaceKey]
}
