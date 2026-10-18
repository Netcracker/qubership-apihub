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

// eslint-disable-next-line filenames/no-index
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import http from 'http'

import type { State } from './types'
import { NONE_DISCOVERY_STATUS } from './types'
import { SystemInfoRouter } from './routes/system/info/router'
import { AgentsRouter } from './routes/namespaces/agents/router'
import { NamespaceRouter } from './routes/namespaces/router'
import { DiscoveryRouter } from './routes/namespaces/services/router'
import { SpecRouter } from './routes/namespaces/services/specs-router'
import { SnapshotRouter } from './routes/namespaces/snapshots/router'
import { SettingsRouter } from './routes/namespaces/settings/router'
import { PublishRouter, PublishV2Router } from './routes/packages/publish/router'
import { WorkspaceRouter } from './routes/namespaces/workspaces/router'
import { AuthenticationCheckReportRouter } from './routes/namespaces/reports/authentication/router'
import { GatewayRoutingReportRouter } from './routes/namespaces/reports/gateway/router'

const app = express()
const port = process.env.NODEJS_PORT || 3003
const server = http.createServer(app)

const state: State = {
  discovery: {
    status: NONE_DISCOVERY_STATUS,
  },
}

const routersMap = new Map([
  ['/api/v1/system/info/', SystemInfoRouter()],
  ['/api/v2/agents', AgentsRouter()],
  ['/apihub-nc/api/v1/agents/:agentId/namespaces/', NamespaceRouter()],
  ['/apihub-nc/api/v2/agents/:agentId/namespaces/:namespaceId/workspaces/:workspaceKey/discover', DiscoveryRouter(state)],
  ['/api/v2/packages/', WorkspaceRouter()],
  ['/apihub-nc/api/v2/security/authCheck', AuthenticationCheckReportRouter()],
  ['/apihub-nc/api/v3/security/gatewayRouting', GatewayRoutingReportRouter()],
  ['/apihub-nc/api/v2/agents/:agentId/namespaces/:namespaceId/workspaces/:workspaceKey/services', DiscoveryRouter(state)],
  ['/apihub-nc/api/v1/agents/:agentId/namespaces/:namespaceId/services/:serviceId/specs/', SpecRouter()],
  ['/apihub-nc/api/v2/agents/:agentId/namespaces/:namespaceId/workspaces/:workspaceKey/services/:serviceId/specs/', SpecRouter()],
  ['/apihub-nc/api/v1/agents/:agentId/namespaces/:namespaceId/snapshots/', SnapshotRouter()],
  ['/apihub-nc/api/v1/agents/:agentId/namespaces/:namespaceId/settings/', SettingsRouter()],
  ['/apihub-nc/api/v1/packages/:packageId/publish/', PublishRouter()],
  ['/apihub-nc/api/v2/packages/:packageId/publish/', PublishV2Router()],
])

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.text())

routersMap.forEach((router, path) => app.use(path, router))

server.listen(port, () => console.log(`Mock server is listening on port ${port}`))
