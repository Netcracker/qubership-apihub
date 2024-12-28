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

import type { AgentKey, NamespaceKey, PackageKey, ServiceKey, SnapshotKey, VersionKey, WorkspaceKey } from './keys'
import type { PublishConfigDto } from './publish-config'
import { ncCustomAgentsRequestJson } from '@apihub/utils/requests'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'

export type Snapshots = {
  packageKey: PackageKey
  snapshots: ReadonlyArray<Snapshot>
}

export type Snapshot = Readonly<{
  key: SnapshotKey
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
        key: crypto.randomUUID(),
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
): Promise<SnapshotsDto> {
  return await ncCustomAgentsRequestJson<SnapshotsDto>(`/agents/${agentId}/namespaces/${namespaceKey}/workspaces/${workspaceKey}/snapshots`, {
      method: 'get',
    },
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
  status?: VersionStatus,
): Promise<PublishConfigDto> {
  return await ncCustomAgentsRequestJson<PublishConfigDto>(`/agents/${agentId}/namespaces/${namespaceKey}/workspaces/${workspaceKey}/snapshots?clientBuild=${clientBuild}&promote=${promote}`, {
      method: 'post',
      body: JSON.stringify(<PublishSnapshotRequestDto>{
        version: version,
        previousVersion: calculatePreviousVersion(previousVersion),
        services: serviceKeys,
        status: status,
        builderId: builderId,
      }),
    },
  )
}
