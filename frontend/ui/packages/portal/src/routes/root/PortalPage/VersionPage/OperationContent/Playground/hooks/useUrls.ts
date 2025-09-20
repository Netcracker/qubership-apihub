import { isObject } from 'lodash'
import { useMemo } from 'react'
import {
  useProcessedCustomServers,
  useProcessedSpecServers,
  useTransformDocumentToNode,
} from '@netcracker/qubership-apihub-rest-playground/hooks'
import type { PlaygroundCustomServer } from './useCustomServersPackageMap'

export const useSpecUrls = (document: object | undefined): string[] => {
  const documentString = useMemo(() => {
    return isObject(document) ? JSON.stringify(document) : ''
  }, [document])

  const httpOperation = useTransformDocumentToNode(documentString)
  const servers = useProcessedSpecServers(httpOperation?.servers, true)

  return useMemo(() => extractUrlsFromServers(servers), [servers])
}

export const useCustomUrls = (customServers: PlaygroundCustomServer[] | undefined): string[] => {
  const servers = useProcessedCustomServers(customServers)

  return useMemo(() => extractUrlsFromServers(servers), [servers])
}

function extractUrlsFromServers(servers: { url: string }[]): string[] {
  return servers.map(server => server.url)
}
