import type { Key } from './keys'
import { requestJson } from '../utils/requests'

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

export async function getNamespaces(agentKey: Key, prefix: string): Promise<NamespacesDto> {
  const agentId = encodeURIComponent(agentKey)

  return await requestJson<NamespacesDto>(`/api/v1/agents/${agentId}/namespaces`, {
      method: 'get',
    },
    {
      basePath: prefix,
    },
  )
}
