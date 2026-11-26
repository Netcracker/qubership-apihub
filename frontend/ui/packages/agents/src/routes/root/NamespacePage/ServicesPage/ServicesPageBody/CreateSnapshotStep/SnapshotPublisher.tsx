import { type FC, memo } from 'react'

import type { PublishDetails } from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'

import type { ServiceConfig } from '@agents/entities/publish-config'
import { useShowSuccessNotification } from '../../../../BasePage/NotificationHandler'
import { useInvalidateSnapshotPublicationInfo } from '../../../useSnapshotPublicationInfo'
import { useInvalidateSnapshots } from '../../../useSnapshots'
import { useSnapshotPublications } from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import { useSnapshotPublicationDetails } from '../useAllPublicationDetails'
import { isSnapshotCreated } from './snapshotPublications'
import { useServicePublishDetails } from './useServicePublishDetails'

const SNAPSHOT_CREATED_TITLE = 'A Snapshot was created'

/**
 * Publishes the services of the created snapshots: the browser builds each service and sends the build to the
 * portal. It is mounted with the wizard state of the namespace, so each build runs once, whatever page of the
 * namespace or step is open and whatever rows the sections show. When the publications end, it refreshes the snapshot
 * queries and reports a created snapshot.
 */
export const SnapshotPublisher: FC = memo(() => {
  const { snapshotPublications } = useSnapshotPublications()
  const invalidateSnapshots = useInvalidateSnapshots()
  const invalidateSnapshotPublicationInfo = useInvalidateSnapshotPublicationInfo()
  const showSuccessNotification = useShowSuccessNotification()

  const handlePublicationsFinal = (allPublishDetails: ReadonlyArray<PublishDetails>): void => {
    invalidateSnapshots()
    snapshotPublications.forEach(({ name }) => invalidateSnapshotPublicationInfo({ snapshotPublicationName: name }))
    // Create Snapshot stays disabled while a publication runs, so the poll ends with the publications of the last
    // snapshot
    const lastSnapshotPublication = snapshotPublications.at(-1)
    if (lastSnapshotPublication && isSnapshotCreated(lastSnapshotPublication, allPublishDetails)) {
      showSuccessNotification({ title: SNAPSHOT_CREATED_TITLE })
    }
  }
  // The only observer of the poll that passes the callback, since React Query calls it for each observer that does
  useSnapshotPublicationDetails(snapshotPublications, handlePublicationsFinal)

  return (
    <>
      {snapshotPublications.flatMap(({ config: { serviceConfigs, builderId } }) =>
        serviceConfigs.map(serviceConfig => (
          <ServiceBuild key={serviceConfig.publishId} serviceConfig={serviceConfig} builderId={builderId} />
        )),
      )}
    </>
  )
})

SnapshotPublisher.displayName = 'SnapshotPublisher'

type ServiceBuildProps = {
  serviceConfig: ServiceConfig
  builderId: string
}

// The outcome of the build reaches the sections through the statuses poll
const ServiceBuild: FC<ServiceBuildProps> = memo<ServiceBuildProps>(({ serviceConfig, builderId }) => {
  useServicePublishDetails({ serviceConfig, builderId })
  return null
})

ServiceBuild.displayName = 'ServiceBuild'
