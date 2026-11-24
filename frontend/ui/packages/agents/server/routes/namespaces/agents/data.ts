import type { Writeable } from '../../../types'
import type { AgentsDto } from './types'

export const AGENTS_DTO: Writeable<AgentsDto> = [{
  agentDeploymentCloud: 'kuber-apps',
  agentDeploymentNamespace: 'api-hub-dev',
  agentId: 'kuber-apps_api-hub-dev',
  agentUrl: 'https://apihub-agent-api-hub-dev.kuber-apps.cloud.example.com',
  backendVersion: 'apihub-3153-20230517.050415-2',
  frontendVersion: '1.0.12-20230515080830',
  lastActive: '2023-05-18T07:55:12.462326Z',
  status: 'active',
  name: 'api-hub-dev.kuber-apps',
}]
