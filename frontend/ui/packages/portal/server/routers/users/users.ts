import type { Router } from 'express'
import { USERS_LIST } from '../../mocks/users/users'

export function getUsersByFilter(router: Router): void {
  router.get('/', (req, res) => {
    res.status(200).json(USERS_LIST)
  })
}
