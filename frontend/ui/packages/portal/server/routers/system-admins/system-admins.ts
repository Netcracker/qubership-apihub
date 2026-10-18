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

import type { Router } from 'express'
import { SYSTEM_ADMINS_LIST } from '../../mocks/admins/system-admin'

export function getSystemAdmins(router: Router): void {
  router.get('/', (req, res) => {
    res.status(200).json(SYSTEM_ADMINS_LIST.admins)
  })
}

export function deleteSystemAdmin(router: Router): void {
  router.delete('/:userId/', (req, res) => {
    SYSTEM_ADMINS_LIST.admins = SYSTEM_ADMINS_LIST.admins.filter((admin) => admin.id !== req.params.userId)

    res.status(200).send()
  })
}

export function addSystemAdmin(router: Router): void {
  router.post('/', (req, res) => {
    const admins = [...SYSTEM_ADMINS_LIST.admins]
    const newRole = {
      ...JSON.parse(req.body),
      id: `${new Date()}`,
    }
    admins.push(newRole)
    SYSTEM_ADMINS_LIST.admins = admins
    res.status(200).json(newRole)
  })
}
