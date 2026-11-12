import type { AgentKey, NamespaceKey, PackageKey, ServiceKey, VersionKey, WorkspaceKey } from './keys'
import type { PublishConfigDto } from './publish-config'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { API_V2, requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

export type Snapshots = {
  packageKey: PackageKey
  snapshots: ReadonlyArray<Snapshot>
}

export type Snapshot = Readonly<{
  versionKey: VersionKey
  previousVersionKey?: VersionKey
  createdAt: string
}>

export type SnapshotsDto = Readonly<{
  packageId: PackageKey
  snapshots: ReadonlyArray<SnapshotDto>
}>

export type SnapshotDto = Readonly<{
  version: VersionKey
  previousVersion: VersionKey | ''
  createdAt: string
}>

export const EMPTY_SNAPSHOTS: Snapshots = {
  packageKey: '',
  snapshots: [],
}

export function isSnapshot(value: Record<string, unknown>): value is Snapshot {
  return typeof value.versionKey === 'string' && typeof value.previousVersionKey === 'string'
}

export function toSnapshots(value: SnapshotsDto): Snapshots {
  return {
    packageKey: value.packageId,
    snapshots: value.snapshots.map(snapshot => {
      return ({
        versionKey: snapshot.version,
        previousVersionKey: snapshot.previousVersion === '' ? undefined : snapshot.previousVersion,
        createdAt: snapshot.createdAt,
      })
    }),
  }
}

export async function getSnapshots(
  agentId: AgentKey,
  namespaceKey: NamespaceKey,
  workspaceKey: WorkspaceKey,
  prefix: string,
): Promise<SnapshotsDto> {
  return await requestJson<SnapshotsDto>(`/agents/${agentId}/namespaces/${namespaceKey}/workspaces/${workspaceKey}/snapshots`, {
      method: 'get',
    },
    { basePath: `${prefix}${API_V2}` },
  )
}

export type PublishSnapshotRequestDto = {
  version: VersionKey
  previousVersion: VersionKey
  services: ServiceKey[]
  status?: 'draft' | 'release'
}
export const NO_PREVIOUS_VERSION_OPTION: VersionKey = '[ No previous version ]'

export function calculatePreviousVersion(value: string): VersionKey {
  return value === NO_PREVIOUS_VERSION_OPTION ? '' : value
}

export async function publishSnapshot(
  agentId: AgentKey,
  namespaceKey: NamespaceKey,
  workspaceKey: WorkspaceKey,
  clientBuild: boolean,
  promote: boolean,
  version: string,
  previousVersion: string,
  serviceKeys: ServiceKey[],
  builderId: string,
  prefix: string,
  status?: VersionStatus,
): Promise<PublishConfigDto> {

  return await requestJson<PublishConfigDto>(`/agents/${agentId}/namespaces/${namespaceKey}/workspaces/${workspaceKey}/snapshots?clientBuild=${clientBuild}&promote=${promote}`, {
      method: 'post',
      body: JSON.stringify(<PublishSnapshotRequestDto>{
        version: version,
        previousVersion: calculatePreviousVersion(previousVersion),
        services: serviceKeys,
        status: status,
        builderId: builderId,
      }),
    },
    { basePath: `${prefix}${API_V2}` },
  )
}
