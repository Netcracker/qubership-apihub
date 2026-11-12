import { API_V2 } from './requests'

export function getAgentProxyServerUrl(prefix: string, serviceKey?: string, agentId?: string, namespace?: string, endpoint = DEFAULT_GRAPHQL_ENDPOINT): string {
  if (!agentId || !namespace) {
    return ''
  }

  return `${prefix}${API_V2}/agents/${agentId}/namespaces/${namespace}/services/${serviceKey}/proxy${endpoint}`
}

export const DEFAULT_GRAPHQL_ENDPOINT = '/api/graphql-server/graphql'
