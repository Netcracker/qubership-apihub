/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Router } from 'express'
import { SERVICES_DTO } from './data'
import type { State } from '../../../types'
import { COMPLETE_DISCOVERY_STATUS, ERROR_DISCOVERY_STATUS, RUNNING_DISCOVERY_STATUS } from '../../../types'
import type { SnapshotRouter } from '../snapshots/router'

type ServiceRouter = Router

export function DiscoveryRouter(state: State): ServiceRouter {
  const router: ServiceRouter = Router()

  getServices(router, state)
  runDiscovery(router, state)

  return router
}

function getServices(router: ServiceRouter, state: State): void {
  router.get('/', (req, res) => {
    res.status(200).json(SERVICES_DTO[state.discovery.status])
  })
}

function runDiscovery(router: SnapshotRouter, state: State): void {
  router.post('/', (req, res) => {
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
