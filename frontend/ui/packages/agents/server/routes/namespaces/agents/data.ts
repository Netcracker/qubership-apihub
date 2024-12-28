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
