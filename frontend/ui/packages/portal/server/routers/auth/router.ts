import { Router } from 'express'
import { performAuth } from './local'

export type AuthRouter = Router

export function AuthRouter(): AuthRouter {
  const router = Router()

  performAuth(router)

  return router
}
