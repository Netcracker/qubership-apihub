import type { Key } from './keys'
import { API_V2, requestJson } from '../utils/requests'
import { isNotEmpty } from '../utils/arrays'

export type ServiceNamesDto = {
  serviceNames: ReadonlyArray<ServiceNameDto>
}

export type ServiceNameDto = {
  id: Key
  name: string
}

export type ServiceNames = ReadonlyArray<ServiceName>

export type ServiceName = {
  key: Key
  name: string
}

export function toServiceNames(value: ServiceNamesDto): ServiceNames {
  return value.serviceNames.map(serviceName => ({
    key: serviceName.id,
    name: serviceName.name,
  }))
}

export async function getServiceNames(agentKey: Key, namespaceName: string, prefix: string): Promise<ServiceNamesDto> {
  const agentId = encodeURIComponent(agentKey)
  const namespace = encodeURIComponent(namespaceName)

  return await requestJson<ServiceNamesDto>(`/agents/${agentId}/namespaces/${namespace}/serviceNames`, {
    method: 'get',
  }, { basePath: `${prefix}${API_V2}` })
}

export function isServiceNameExistInNamespace(
  data: ServiceNames,
  serviceName: string | undefined,
  cloudKey: Key | undefined,
  namespaceKey: Key | undefined,
): boolean {
  if (isNotEmpty(data) && cloudKey && namespaceKey) {
    return data.some(({ name }) => name === serviceName)
  }
  // Return true until all required fields are filled in
  return true
}
