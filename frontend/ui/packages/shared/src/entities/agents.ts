import type { Key } from './keys'
import { API_V2, requestJson } from '../utils/requests'

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

export async function getAgents(prefix: string): Promise<Agents> {
  return await requestJson<Agents>('/agents', {
    method: 'get',
  }, { basePath: `${prefix}${API_V2}` })
}
