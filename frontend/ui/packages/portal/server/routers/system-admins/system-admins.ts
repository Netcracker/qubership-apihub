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
