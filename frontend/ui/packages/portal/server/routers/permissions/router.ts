import { Router } from 'express'
import type { WithWebsocketMethod } from 'express-ws'
import { getPermissions } from './permissions'

export type PermissionsRouter = Router & WithWebsocketMethod

export function PermissionsRouter(): PermissionsRouter {
  const router = Router() as PermissionsRouter

  getPermissions(router)

  return router
}
