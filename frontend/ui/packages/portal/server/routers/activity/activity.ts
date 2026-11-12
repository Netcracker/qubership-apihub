import type { Router } from 'express'
import { ACTIVITIES_LIST } from '../../mocks/packages/activities'

export function getActivityHistory(router: Router): void {
  router.get('/', (req, res) => {
    res.status(200).json(ACTIVITIES_LIST)
  })
}
