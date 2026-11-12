import { Router } from 'express'
import type { PublishDetails } from '../../../types'
import { COMPLETE_PUBLISH_STATUS, RUNNING_PUBLISH_STATUS } from '../../../types'

type PublishRouter = Router

export function PublishRouter(): PublishRouter {
  const router: PublishRouter = Router()

  getPublishDetails(router)
  setPublishDetails(router)

  return router
}

export function PublishV2Router(): PublishRouter {
  const router: PublishRouter = Router()

  getPublishDetails(router)
  setPublishDetails(router)
  getAllPublishDetails(router)

  return router
}

const publishDetailMap: Record<string, PublishDetails> = {}

function getPublishDetails(router: PublishRouter): void {
  router.get('/:publishId/status/', (req, res) => {
    const { publishId } = req.params
    const publishDetail = publishDetailMap[publishId]

    if (!publishDetail) {
      publishDetailMap[publishId] = {
        publishId: publishId,
        status: RUNNING_PUBLISH_STATUS,
        message: '',
      }
    }

    if (publishDetail?.status !== RUNNING_PUBLISH_STATUS) { /* empty */ } else {
      setTimeout(() => {
        publishDetailMap[publishId] = {
          publishId: publishId,
          status: COMPLETE_PUBLISH_STATUS,
          message: 'Published successfully',
        }
      }, 3000)
    }

    res.status(200).json(publishDetail)
  })
}

function getAllPublishDetails(router: PublishRouter): void {
  router.post('/statuses/', (req, res) => {
    const { publishIds }: { publishIds: string[] } = JSON.parse(req.body)

    setTimeout(() => {
      res.status(200).json(publishIds.map(publishId => ({
        publishId: publishId,
        status: COMPLETE_PUBLISH_STATUS,
        message: 'Published successfully',
      })))
    }, 3000)
  })
}

function setPublishDetails(router: PublishRouter): void {
  router.post('/:publishId/status/', (req, res) => {
    res.status(202).send()
  })
}
