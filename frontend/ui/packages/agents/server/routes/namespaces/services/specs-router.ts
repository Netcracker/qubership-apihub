import { Router } from 'express'
import { getFileContent } from '../../../utils'

type SpecRouter = Router

export function SpecRouter(): SpecRouter {
  const router: SpecRouter = Router()

  getSpec(router)

  return router
}

function getSpec(router: SpecRouter): void {
  router.get('/:specId', (req, res) => {
    res.status(200).send(getFileContent(req.params.specId))
  })
}
