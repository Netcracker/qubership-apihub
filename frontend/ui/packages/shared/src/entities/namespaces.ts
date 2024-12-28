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
import { APIHUB_NC_BASE_PATH } from '../utils/urls'

export type Namespaces = ReadonlyArray<Namespace>

export type Namespace = Readonly<{
  cloudKey: Key
  namespaceKey: Key
}>

export type NamespacesDto = Readonly<{
  cloudName: Key
  namespaces: ReadonlyArray<Key>
}>

export const EMPTY_NAMESPACE: Namespace = {
  cloudKey: '',
  namespaceKey: '',
}

export const EMPTY_NAMESPACES: Namespaces = []

export function toNamespaces(value: NamespacesDto): Namespaces {
  return value.namespaces.map(namespace => ({
    cloudKey: value.cloudName,
    namespaceKey: namespace,
  }))
}

export async function getNamespaces(agentKey: Key): Promise<NamespacesDto> {
  const agentId = encodeURIComponent(agentKey)

  return await requestJson<NamespacesDto>(`/api/v1/agents/${agentId}/namespaces`, {
      method: 'get',
    },
    {
      basePath: APIHUB_NC_BASE_PATH,
    },
  )
}
