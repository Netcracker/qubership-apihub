import cors from 'cors'
import type { Express, Router } from 'express'
import express from 'express'
import { ActivityRouter } from './routers/activity/router'
import { AiChatRouter } from './routers/ai-chat/router'
import { EphemeralFilesRouter } from './routers/ephemeral-files/router'
import { AuthRouter } from './routers/auth/router'
import { GlobalSearchRouter } from './routers/global-search/router'
import { PackagesRouter, PackageTokensRouter } from './routers/packages/router'
import { PermissionsRouter } from './routers/permissions/router'
import { RolesRouter } from './routers/roles/router'
import { SystemAdminsRouter } from './routers/system-admins/router'
import { SystemRouter } from './routers/system/router'
import { UsersRouter } from './routers/users/router'

// Factory split out of index.ts so tests (supertest) can mount the app without
// binding to a port. index.ts wires the network listener on top of this.
export function createApp(): Express {
  const app = express()
  const routersMap = new Map<string, Router>([
    ['/api/v2/auth/', AuthRouter()],
    ['/api/v2/users/', UsersRouter()],
    ['/api/v2/roles/', RolesRouter()],
    ['/api/v2/permissions/', PermissionsRouter()],
    ['/api/v1/system/', SystemRouter()],
    ['/api/:v/packages/', PackagesRouter()],
    ['/api/v3/packages/', PackageTokensRouter()],
    ['/api/v2/search/', GlobalSearchRouter()],
    ['/api/v2/activity/', ActivityRouter()],
    ['/api/v2/admins/', SystemAdminsRouter()],
    ['/api/v1/ai-chat/', AiChatRouter()],
    ['/api/v1/ephemeral-files/', EphemeralFilesRouter()],
  ])

  app.use(cors())
  app.use(express.json())
  app.use(express.text())

  routersMap.forEach((router, path) => app.use(path, router))

  return app
}
