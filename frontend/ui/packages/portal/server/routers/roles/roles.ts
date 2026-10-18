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
import { ROLES_LIST } from '../../mocks/roles/roles'

export function getRoles(router: Router): void {
  router.get('/', (req, res) => {
    res.status(200).json(ROLES_LIST)
  })
}

export function deleteRole(router: Router): void {
  router.delete('/:roleId/', (req, res) => {
    ROLES_LIST.roles = ROLES_LIST.roles.filter(({ roleId }) => roleId !== req.params.roleId)

    res.status(200).send()
  })
}

export function updateRole(router: Router): void {
  router.patch('/:roleId/', (req, res) => {
    ROLES_LIST.roles = ROLES_LIST.roles.map(roleObject => {
      const { permissions } = JSON.parse(req.body)
      if (roleObject.roleId === req.params.roleId) {
        return {
          ...roleObject,
          permissions: permissions,
        }
      }

      return roleObject
    })

    res.status(200).json(ROLES_LIST.roles.find(roleObject => roleObject.roleId === req.params.roleId))
  })
}

export function createRole(router: Router): void {
  router.post('/', (req, res) => {
    const roles = [...ROLES_LIST.roles]
    const newRole = {
      ...JSON.parse(req.body),
      roleId: `role-${new Date()}`,
    }
    roles.push(newRole)
    ROLES_LIST.roles = roles
    res.status(200).json(newRole)
  })
}
