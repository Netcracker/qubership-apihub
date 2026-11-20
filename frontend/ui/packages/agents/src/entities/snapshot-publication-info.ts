import type { AgentKey, NamespaceKey, SnapshotKey, WorkspaceKey } from './keys'
import type { ServicePublishInfo, ServicePublishInfoDto } from './service-publish-info'
import { toServicePublishInfo } from './service-publish-info'
import { API_V2, requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export type SnapshotPublicationInfo = Readonly<{
  services: ReadonlyArray<ServicePublishInfo>
  apiTypes?: ApiType[]
}>

export type SnapshotPublicationInfoDto = Readonly<{
  services: ReadonlyArray<ServicePublishInfoDto>
  apiTypes?: ApiType[]
}>

export const EMPTY_SNAPSHOT_PUBLICATION_INFO: SnapshotPublicationInfo = {
  services: [],
}

export function toSnapshotPublicationInfo(value: SnapshotPublicationInfoDto): SnapshotPublicationInfo {
  return {
    services: value.services.map(toServicePublishInfo),
    apiTypes: value.apiTypes,
  }
}

export async function getSnapshotPublicationInfo(
  agentId: AgentKey,
  namespaceKey: NamespaceKey,
  workspaceKey: WorkspaceKey,
  snapshotKey: SnapshotKey,
  promote = false,
  prefix: string,
): Promise<SnapshotPublicationInfoDto> {
  return await requestJson<SnapshotPublicationInfoDto>(`/agents/${agentId}/namespaces/${namespaceKey}/workspaces/${workspaceKey}/snapshots/${encodeURIComponent(snapshotKey)}?promote=${promote}`, {
      method: 'get',
    },
    {
      basePath: `${prefix}${API_V2}`,
      ignoreNotFound: true,
    },
  )
}
