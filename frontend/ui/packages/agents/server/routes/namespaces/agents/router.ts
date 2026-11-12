import { Router } from 'express'
import { AGENTS_DTO } from './data'

type AgentsRouter = Router

export function AgentsRouter(): AgentsRouter {
  const router: AgentsRouter = Router()

  getAgents(router)

  return router
}

function getAgents(router: AgentsRouter): void {
  router.get('/', (req, res) => {
    res.status(200).json(AGENTS_DTO)
  })
}
