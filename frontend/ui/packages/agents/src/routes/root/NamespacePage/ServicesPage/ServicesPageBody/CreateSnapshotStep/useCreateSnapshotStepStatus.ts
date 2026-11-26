import { useSnapshotPublications } from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import type { StepStatus } from '../../ServicesPageProvider/servicesSteps'
import { useSnapshotPublicationDetails } from '../useAllPublicationDetails'
import { getCreateSnapshotStepStatus } from './snapshotPublications'
import { useIsCreatingSnapshot } from './useCreateSnapshot'

/** The status of Create Snapshot, computed from the create request and the polled publications of its snapshots. */
export function useCreateSnapshotStepStatus(): StepStatus {
  const { snapshotPublications, failedCreateSnapshotOptions } = useSnapshotPublications()
  const allPublishDetails = useSnapshotPublicationDetails(snapshotPublications)
  const isCreating = useIsCreatingSnapshot()

  return getCreateSnapshotStepStatus({
    snapshotPublications: snapshotPublications,
    allPublishDetails: allPublishDetails,
    isCreating: isCreating,
    isCreationFailed: failedCreateSnapshotOptions !== undefined,
  })
}
