import { Router } from 'express'
import { getInfo } from './system'

export type SystemRouter = Router

export function SystemRouter(): SystemRouter {
  const router = Router()

  getInfo(router)

  return router
}
