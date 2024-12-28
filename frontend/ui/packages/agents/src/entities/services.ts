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

import type { DiscoveryStatus } from './statuses'
import { NONE_DISCOVERY_STATUS } from './statuses'
import type { AgentKey, NamespaceKey, PackageKey, ServiceKey, VersionKey, WorkspaceKey } from './keys'
import type { VersionStatuses } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { Spec, SpecDto } from '@netcracker/qubership-apihub-ui-shared/entities/specs'
import { toSpec } from '@netcracker/qubership-apihub-ui-shared/entities/specs'
import { ncCustomAgentsRequestJson, ncCustomAgentsRequestVoid } from '@apihub/utils/requests'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

export type Services = {
  status: DiscoveryStatus
  services: ReadonlyArray<Service>
}

export type Service = Readonly<{
  key: ServiceKey
  specs: ReadonlyArray<Spec>
  labels?: ServiceLabels
  availablePromoteStatuses?: VersionStatuses
  baseline?: Baseline
}>

type Baseline = Readonly<{
  packageKey: PackageKey
  name: string
  versions: ReadonlyArray<VersionKey>
  url: string
}>

export type ServiceDto = Readonly<{
  id: ServiceKey
  specs: ReadonlyArray<SpecDto>
  serviceLabels?: ServiceLabels
  availablePromoteStatuses?: VersionStatuses
  baseline?: BaselineDto
  proxyServerUrl?: string
}>

type BaselineDto = Readonly<{
  packageId: PackageKey
  name: string
  versions: ReadonlyArray<VersionKey>
  url: string
}>

export type ServicesDto = Readonly<{
  status: DiscoveryStatus
  services: ReadonlyArray<ServiceDto>
}>

export const EMPTY_SERVICES: Services = {
  services: [],
  status: NONE_DISCOVERY_STATUS,
}

export type ServiceLabels = Record<string, string>

export function isService(value: Record<string, unknown>): value is Service {
  return value.specs instanceof Array
}

export function toServices(value: ServicesDto): Services {
  return {
    status: value.status,
    services: value.services.map(service => ({
      key: service.id,
      specs: service.specs?.map(spec => toSpec(spec, service.id, service?.proxyServerUrl)),
      baseline: service.baseline && {
        packageKey: service.baseline.packageId,
        name: service.baseline.name,
        versions: service.baseline.versions,
        url: service.baseline.url,
      },
      labels: service.serviceLabels,
      availablePromoteStatuses: service.availablePromoteStatuses,
    })),
  }
}

export type ProxyServer = Partial<{
  url: string
  description: string
}>

export async function getServices(
  agentId: AgentKey,
  namespaceKey: NamespaceKey,
  workspaceKey: WorkspaceKey,
  onlyWithSpecs: boolean = false,
): Promise<ServicesDto> {
  const servicesDto = await ncCustomAgentsRequestJson<ServicesDto>(`/agents/${agentId}/namespaces/${namespaceKey}/workspaces/${workspaceKey}/services`, {
      method: 'get',
    },
  )
  if (onlyWithSpecs) {
    return {
      ...servicesDto,
      services: servicesDto.services.filter(({ specs }) => isNotEmpty(specs)),
    }
  }
  return servicesDto
}

export async function runServiceDiscovery(
  agentId: AgentKey,
  namespaceKey: NamespaceKey,
  workspaceKey: WorkspaceKey,
): Promise<void> {
  return await ncCustomAgentsRequestVoid(`/agents/${agentId}/namespaces/${namespaceKey}/workspaces/${workspaceKey}/discover`, {
      method: 'post',
    },
  )
}
