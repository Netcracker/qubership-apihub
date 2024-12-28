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
import { ProjectsRouter } from './routers/projects/router'
import { ProjectsWsRouter } from './routers/websockets/websockets'
import ws from 'ws'
import http from 'http'
import { DebugRouter } from './routers/debug/router'
import { AuthRouter } from './routers/auth/router'
import { IntegrationsRouter } from './routers/integrations/router'
import { SystemRouter } from './routers/system/router'
import { GroupsRouter } from './routers/groups/router'
import { GlobalSearchRouter } from './routers/global-search/router'
import { UsersRouter } from './routers/users/router'

const app = express()
const port = process.env.NODEJS_PORT || 3004
const server = http.createServer(app)

const branchWss = new ws.Server({ noServer: true })
const fileWss = new ws.Server({ noServer: true })

const routersMap = new Map([
  ['/api/v2/auth/', AuthRouter()],
  ['/api/v2/users/', UsersRouter()],
  ['/api/v1/debug/', DebugRouter()],
  ['/api/v1/system/', SystemRouter()],
  ['/api/v1/integrations/', IntegrationsRouter()],
  ['/api/v1/projects/', ProjectsRouter(branchWss)],
  ['/api/v1/groups/', GroupsRouter()],
  ['/api/v1/search/', GlobalSearchRouter()],
  ['/ws/v1/projects/', ProjectsWsRouter(server, branchWss, fileWss)],
])

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.text())

routersMap.forEach((router, path) => app.use(path, router))

server.listen(port, () => console.log(`Mock server is listening on port ${port}`))
