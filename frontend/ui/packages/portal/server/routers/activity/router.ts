import { Router } from 'express'
import { getActivityHistory } from './activity'

export function ActivityRouter(): Router {
  const router = Router()

  getActivityHistory(router)

  return router
}
