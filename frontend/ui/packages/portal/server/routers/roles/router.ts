import { Router } from 'express'
import type { WithWebsocketMethod } from 'express-ws'
import { createRole, deleteRole, getRoles, updateRole } from './roles'

export type RolesRouter = Router & WithWebsocketMethod

export function RolesRouter(): RolesRouter {
  const router = Router() as RolesRouter

  updateRole(router)
  deleteRole(router)
  createRole(router)

  getRoles(router)

  return router
}
