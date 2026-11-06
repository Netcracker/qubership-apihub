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
import type { SystemConfigurationRouter } from './router'

export const DOCS_BACKEND_PATH_PREFIX = 'docs-backend'

// Set MOCK_ANONYMOUS_ACCESS=false to emulate a backend without anonymous access support
function isAnonymousAccessEnabled(): boolean {
  return process.env.MOCK_ANONYMOUS_ACCESS !== 'false'
}

export function getSystemConfiguration(router: SystemConfigurationRouter): void {
  router.get('/configuration/', (req, res) => {
    res.status(200).json({
      defaultWorkspaceId: 'workspace-1',
      authConfig: {
        identityProviders: [{
          id: 'internal',
          type: 'internal',
          displayName: 'Local',
        }],
        autoLogin: false,
      },
      extensions: [{
        name: 'docs-backend',
        baseUrl: 'http://documents-backend:8080',
        pathPrefix: DOCS_BACKEND_PATH_PREFIX,
      }],
      anonymousAccess: isAnonymousAccessEnabled(),
    })
  })
}

export function getSystemStats(router: SystemConfigurationRouter): void {
  router.get('/stats/', (req, res) => {
    res.status(200).json({
      versions: 128,
      operations: 2415,
    })
  })
}
