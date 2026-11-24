import { Router } from 'express'
import { storeLogs } from './logs'

export type DebugRouter = Router

export function DebugRouter(): DebugRouter {
  const router = Router()

  storeLogs(router)

  return router
}
