import type { DiscoveryStatus } from './statuses'
import { NONE_DISCOVERY_STATUS } from './statuses'
import type { AgentKey, NamespaceKey, PackageKey, ServiceKey, VersionKey, WorkspaceKey } from './keys'
import type { VersionStatuses } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { Spec, SpecDto } from '@netcracker/qubership-apihub-ui-shared/entities/specs'
import { toSpec } from '@netcracker/qubership-apihub-ui-shared/entities/specs'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { API_V2, requestJson, requestVoid } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'

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
  versions: ReadonlyArray<BaselineVersion>
  url: string
}>

export type BaselineVersion = Readonly<{
  versionKey: VersionKey
  hasErrors: boolean
  changelogHasErrors: boolean
  apiProcessorVersion?: string
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
  versions: ReadonlyArray<BaselineVersionDto>
  url: string
}>

// The agents-backend sends a plain version key until it passes the error flags from the agent.
export type BaselineVersionDto =
  | VersionKey
  | Readonly<{
    version: VersionKey
    hasErrors?: boolean
    changelogHasErrors?: boolean
    apiProcessorVersion?: string
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

/** Formats a label of a service as `key: value`, the form the table shows and the search matches. */
export function getFormattedLabel(key: string, value: string): string {
  return `${key}: ${value}`
}

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
        versions: service.baseline.versions.map(toBaselineVersion),
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
  prefix: string,
): Promise<ServicesDto> {
  const servicesDto = await requestJson<ServicesDto>(
    `/agents/${agentId}/namespaces/${namespaceKey}/workspaces/${workspaceKey}/services`,
    {
      method: 'get',
    },
    { basePath: `${prefix}${API_V2}` },
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
  prefix: string,
): Promise<void> {
  return await requestVoid(`/agents/${agentId}/namespaces/${namespaceKey}/workspaces/${workspaceKey}/discover`, {
      method: 'post',
    },
    { basePath: `${prefix}${API_V2}` },
  )
}

function toBaselineVersion(value: BaselineVersionDto): BaselineVersion {
  if (typeof value === 'string') {
    return {
      versionKey: getSplittedVersionKey(value).versionKey,
      hasErrors: false,
      changelogHasErrors: false,
    }
  }
  return {
    versionKey: getSplittedVersionKey(value.version).versionKey,
    hasErrors: value.hasErrors ?? false,
    changelogHasErrors: value.changelogHasErrors ?? false,
    apiProcessorVersion: value.apiProcessorVersion,
  }
}
