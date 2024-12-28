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

export type Agents = ReadonlyArray<Agent>

export type Agent = AgentDto

export type AgentDto = Readonly<{
  agentId: Key
  agentDeploymentCloud: Key
  name: string
  status: string
}>

export const EMPTY_AGENTS: Agents = []
export const EMPTY_AGENT: Agent = {
  agentId: '',
  agentDeploymentCloud: '',
  name: '',
  status: '',
}

export async function getAgents(): Promise<Agents> {
  return await requestJson<Agents>('/api/v2/agents', {
    method: 'get',
  })
}
