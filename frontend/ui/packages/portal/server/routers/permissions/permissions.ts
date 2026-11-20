import type { Router } from 'express'
import { PERMISSIONS_LIST } from '../../mocks/permissions/permissions'

export function getPermissions(router: Router): void {
  router.get('/', (req, res) => {
    res.status(200).json(PERMISSIONS_LIST)
  })
}
