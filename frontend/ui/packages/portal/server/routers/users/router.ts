import { Router } from 'express'
import type { WithWebsocketMethod } from 'express-ws'
import { getUsersByFilter } from './users'

export type UsersRouter = Router & WithWebsocketMethod

export function UsersRouter(): UsersRouter {
  const router = Router() as UsersRouter

  getUsersByFilter(router)

  return router
}
