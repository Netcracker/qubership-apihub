import { isEmpty, isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import {
  COMPLETE_PUBLISH_STATUS,
  type PublishDetails,
  RUNNING_PUBLISH_STATUS,
} from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'

import type { ServiceConfig } from '@agents/entities/publish-config'
import { EMPTY_PUBLISH_DETAILS } from '@agents/entities/publish-details'
import type { Service } from '@agents/entities/services'
import type { SnapshotPublication } from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import {
  COMPLETE_STEP_STATUS,
  ERROR_STEP_STATUS,
  NONE_STEP_STATUS,
  RUNNING_STEP_STATUS,
  type StepStatus,
} from '../../ServicesPageProvider/servicesSteps'
import { getCombinedPublishStatus, getPublishIds } from '../useAllPublicationDetails'

type CreateSnapshotStepState = Readonly<{
  snapshotPublications: ReadonlyArray<SnapshotPublication>
  allPublishDetails: ReadonlyArray<PublishDetails>
  isCreating: boolean
  isCreationFailed: boolean
}>

/**
 * Returns the services that went into no snapshot, which Create Snapshot still offers. A service whose publication
 * failed stays in its snapshot.
 */
export function getServicesOutsideSnapshots(
  services: ReadonlyArray<Service>,
  snapshotPublications: ReadonlyArray<SnapshotPublication>,
): ReadonlyArray<Service> {
  const snapshotServiceKeys = new Set(
    snapshotPublications.flatMap(({ config }) => config.serviceConfigs.map(({ serviceId }) => serviceId)),
  )
  return services.filter(({ key }) => !snapshotServiceKeys.has(key))
}

/** Returns the publication of a service of a snapshot, empty until the poll lists it. */
export function getServicePublishDetails(
  allPublishDetails: ReadonlyArray<PublishDetails>,
  { publishId }: ServiceConfig,
): PublishDetails {
  return allPublishDetails.find(details => details.publishId === publishId) ?? EMPTY_PUBLISH_DETAILS
}

/**
 * Returns the publication of a snapshot as a whole, for the status in its header: running until each publication of
 * the snapshot is final, the snapshot itself included, failed when one of them failed, and with the errors and the
 * changelog errors of its services.
 */
export function getSnapshotPublishDetails(
  { config }: SnapshotPublication,
  allPublishDetails: ReadonlyArray<PublishDetails>,
): PublishDetails {
  const servicePublishDetails = config.serviceConfigs.map(
    serviceConfig => getServicePublishDetails(allPublishDetails, serviceConfig),
  )
  return {
    publishId: config.snapshotConfig?.publishId ?? '',
    status: getCombinedPublishStatus(allPublishDetails, getPublishIds(config)),
    hasErrors: servicePublishDetails.some(({ hasErrors }) => hasErrors ?? false),
    changelogHasErrors: servicePublishDetails.some(({ changelogHasErrors }) => changelogHasErrors ?? false),
  }
}

/**
 * Returns the status of Create Snapshot: running while a create request or a publication runs, failed while the last
 * create request failed or when no service of any snapshot was published, and complete once a service was published.
 */
export function getCreateSnapshotStepStatus({
  snapshotPublications,
  allPublishDetails,
  isCreating,
  isCreationFailed,
}: CreateSnapshotStepState): StepStatus {
  if (isCreating) {
    return RUNNING_STEP_STATUS
  }
  if (isCreationFailed) {
    return ERROR_STEP_STATUS
  }
  if (isEmpty(snapshotPublications)) {
    return NONE_STEP_STATUS
  }
  const isPublishing = snapshotPublications.some(
    ({ config }) => getCombinedPublishStatus(allPublishDetails, getPublishIds(config)) === RUNNING_PUBLISH_STATUS,
  )
  if (isPublishing) {
    return RUNNING_STEP_STATUS
  }
  // A failed service fails the step only when no service of any snapshot was published
  return isNotEmpty(getPublishedServiceConfigs(snapshotPublications, allPublishDetails))
    ? COMPLETE_STEP_STATUS
    : ERROR_STEP_STATUS
}

/** Whether a service of the snapshot was published, so the snapshot was created with it. */
export function isSnapshotCreated(
  snapshotPublication: SnapshotPublication,
  allPublishDetails: ReadonlyArray<PublishDetails>,
): boolean {
  return isNotEmpty(getPublishedServiceConfigs([snapshotPublication], allPublishDetails))
}

/** Whether a published service of the snapshots has a baseline package, which Promote Version needs. */
export function hasPromotableService(
  snapshotPublications: ReadonlyArray<SnapshotPublication>,
  allPublishDetails: ReadonlyArray<PublishDetails>,
  services: ReadonlyArray<Service>,
): boolean {
  const serviceKeysWithBaseline = new Set(
    services.filter(({ baseline }) => baseline !== undefined).map(({ key }) => key),
  )
  return getPublishedServiceConfigs(snapshotPublications, allPublishDetails)
    .some(({ serviceId }) => serviceKeysWithBaseline.has(serviceId))
}

function getPublishedServiceConfigs(
  snapshotPublications: ReadonlyArray<SnapshotPublication>,
  allPublishDetails: ReadonlyArray<PublishDetails>,
): ReadonlyArray<ServiceConfig> {
  return snapshotPublications
    .flatMap(({ config }) => config.serviceConfigs)
    .filter(serviceConfig =>
      getServicePublishDetails(allPublishDetails, serviceConfig).status === COMPLETE_PUBLISH_STATUS,
    )
}
