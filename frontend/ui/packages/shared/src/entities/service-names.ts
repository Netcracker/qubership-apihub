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

import type { Key } from './keys'
import { requestJson } from '../utils/requests'
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

export async function getServiceNames(agentKey: Key, namespaceName: string): Promise<ServiceNamesDto> {
  const agentId = encodeURIComponent(agentKey)
  const namespace = encodeURIComponent(namespaceName)

  return await requestJson<ServiceNamesDto>(`/api/v2/agents/${agentId}/namespaces/${namespace}/serviceNames`, {
    method: 'get',
  })
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
