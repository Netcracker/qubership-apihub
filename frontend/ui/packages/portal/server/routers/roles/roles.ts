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
