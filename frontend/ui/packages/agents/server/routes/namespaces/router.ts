import { Router } from 'express'
import { NAMESPACES_DTO } from './data'
import type { State } from '../../types'
import { COMPLETE_DISCOVERY_STATUS, ERROR_DISCOVERY_STATUS, RUNNING_DISCOVERY_STATUS } from '../../types'
import type { SnapshotRouter } from './snapshots/router'

type NamespaceRouter = Router

export function NamespaceRouter(state: State): NamespaceRouter {
  const router: NamespaceRouter = Router()

  getNamespaces(router)
  runDiscovery(router, state)

  return router
}

function getNamespaces(router: NamespaceRouter): void {
  router.get('/', (req, res) => {
    res.status(200).json(NAMESPACES_DTO)
  })
}

function runDiscovery(router: SnapshotRouter, state: State): void {
  router.post('/:namespaceId/discover', (req, res) => {
    const errorProbability = 0.125

    setTimeout(() => {
      state.discovery.status = Math.random() < errorProbability ? ERROR_DISCOVERY_STATUS : RUNNING_DISCOVERY_STATUS
      res.status(202).send('Discovery is started')
    }, 1000)

    setTimeout(() => {
      state.discovery.status = COMPLETE_DISCOVERY_STATUS
    }, 3000)
  })
}
