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

import type { APIRequestContext, APIResponse } from '@playwright/test'
import type { RestAgentConfig, RestSnapshot } from './rest.types'

//TODO: сhange endpoints after they change on the backend (/apihub/api/ doesn't work)
export async function rCreateSnapshot(rc: APIRequestContext, params: RestSnapshot): Promise<APIResponse> {
  return await rc.post(`/apihub/api/v1/agents/${params.agentId}/namespaces/${params.namespace}/snapshots?clientBuild=false&promote=${params.promote}`, {
    data: {
      version: params.version,
      previousVersion: params.previousVersion,
      services: params.services,
      status: params.status || '',
    },
  })
}

export async function rRunDiscovery(rc: APIRequestContext, params: RestAgentConfig): Promise<APIResponse> {
  return await rc.post(`/apihub/api/v2/agents/${params.cloud}/namespaces/${params.namespace}/workspaces/${params.workspaceId}/discover`)
}

export async function rGetServices(rc: APIRequestContext, params: RestAgentConfig): Promise<APIResponse> {
  return await rc.get(`/apihub/api/v2/agents/${params.cloud}/namespaces/${params.namespace}/workspaces/${params.workspaceId}/services`)
}

export async function rGetNamespaces(rc: APIRequestContext, params: { cloud: string }): Promise<APIResponse> {
  return await rc.get(`/apihub/api/v1/agents/${params.cloud}/namespaces`)
}
