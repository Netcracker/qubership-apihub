import { Router } from 'express'
import { NEWLY_PUBLISHED_SNAPSHOT_PUBLISH_INFO_DTO, SNAPSHOT_PUBLISH_INFO_DTO, SNAPSHOTS_DTO } from './data'
import { COMPLETE_SERVICES_DTO } from '../services/data'
import type { PublishConfigDto, PublishSnapshotRequestDto } from './types'

export type SnapshotRouter = Router

export function SnapshotRouter(): SnapshotRouter {
  const router: SnapshotRouter = Router()

  getSnapshots(router)
  publishSnapshot(router)
  getSnapshotPublishInfo(router)

  return router
}

export function getSnapshots(router: SnapshotRouter): void {
  router.get('/', (req, res) => {
    res.status(200).json(SNAPSHOTS_DTO)
  })
}

export function publishSnapshot(router: SnapshotRouter): void {
  router.post('/', (req, res) => {
    const { version, previousVersion, services }: PublishSnapshotRequestDto = JSON.parse(req.body)

    setTimeout(() => {
      res.status(202).send(<PublishConfigDto>{
        snapshot: {
          publishId: 'snapshot-publish-key',
          packageId: 'MYPKG',
        },
        services: services.map(serviceId => {
          const serviceDto = COMPLETE_SERVICES_DTO.services.find(service => service.id === serviceId)
          return ({
            serviceId: serviceId,
            publishId: `publication-${serviceId}`,
            packageId: 'MYPKG',
            version: version,
            previousVersion: previousVersion,
            versionFolder: '',
            status: 'draft',
            refs: [],
            files: serviceDto?.specs.map(spec => ({
              fileId: spec.fileId,
              publish: true,
              labels: [],
            })),
            labels: [
              'label-1',
              'label-2',
            ],
          })
        }),
      })
    }, 1000)

    setTimeout(() => {
      SNAPSHOTS_DTO.snapshots = [
        {
          version: version,
          previousVersion: previousVersion,
          publishedAt: new Date(Date.now()).toDateString(),
        },
        ...SNAPSHOTS_DTO.snapshots,
      ]
    }, 3000)
  })
}

export function getSnapshotPublishInfo(router: SnapshotRouter): void {
  router.get('/:versionId', (req, res) => {
    const { versionId } = req.params
    return res.status(200).json(SNAPSHOT_PUBLISH_INFO_DTO[versionId] ?? NEWLY_PUBLISHED_SNAPSHOT_PUBLISH_INFO_DTO)
  })
}
