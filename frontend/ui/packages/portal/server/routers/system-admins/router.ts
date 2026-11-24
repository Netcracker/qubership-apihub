import { Router } from 'express'
import type { WithWebsocketMethod } from 'express-ws'
import { addSystemAdmin, deleteSystemAdmin, getSystemAdmins } from './system-admins'

export type SystemAdminsRouter = Router & WithWebsocketMethod

export function SystemAdminsRouter(): SystemAdminsRouter {
  const router = Router() as SystemAdminsRouter

  deleteSystemAdmin(router)
  addSystemAdmin(router)

  getSystemAdmins(router)

  return router
}
