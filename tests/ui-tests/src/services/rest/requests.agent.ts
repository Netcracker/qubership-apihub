import type { APIRequestContext, APIResponse } from '@playwright/test'
import type { RestAgentConfig, RestSnapshot } from './rest.types'

const AGENTS_BE_API_V2 = '/agents-backend/api/v2/agents'

export async function rCreateSnapshot(rc: APIRequestContext, params: RestSnapshot): Promise<APIResponse> {
  return await rc.post(`${AGENTS_BE_API_V2}/${params.agentId}/namespaces/${params.namespace}/snapshots?clientBuild=false&promote=${params.promote}`, {
    data: {
      version: params.version,
      previousVersion: params.previousVersion,
      services: params.services,
      status: params.status || '',
    },
  })
}

export async function rRunDiscovery(rc: APIRequestContext, params: RestAgentConfig): Promise<APIResponse> {
  return await rc.post(`${AGENTS_BE_API_V2}/${params.cloud}/namespaces/${params.namespace}/workspaces/${params.workspaceId}/discover`)
}

export async function rGetServices(rc: APIRequestContext, params: RestAgentConfig): Promise<APIResponse> {
  return await rc.get(`${AGENTS_BE_API_V2}/${params.cloud}/namespaces/${params.namespace}/workspaces/${params.workspaceId}/services`)
}

export async function rGetNamespaces(rc: APIRequestContext, params: { cloud: string }): Promise<APIResponse> {
  return await rc.get(`${AGENTS_BE_API_V2}/${params.cloud}/namespaces`)
}
