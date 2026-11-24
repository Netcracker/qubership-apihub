import { Router } from 'express'
import { SYSTEM_INFO_DTO } from './data'

type SystemInfoRouter = Router

export function SystemInfoRouter(): SystemInfoRouter {
  const router: SystemInfoRouter = Router()

  getSystemInfo(router)

  return router
}

function getSystemInfo(router: SystemInfoRouter): void {
  router.get('/', (req, res) => {
    res.status(200).json(SYSTEM_INFO_DTO)
  })
}
