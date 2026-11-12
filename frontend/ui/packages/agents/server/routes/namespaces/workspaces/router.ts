import { Router } from 'express'
import { WORKSPACES_DTO } from './data'

type WorkspaceRouter = Router

export function WorkspaceRouter(): WorkspaceRouter {
  const router: WorkspaceRouter = Router()

  getWorkspaces(router)

  return router
}

function getWorkspaces(router: WorkspaceRouter): void {
  router.get('/', (req, res) => {
    res.status(200).json(WORKSPACES_DTO)
  })
}

