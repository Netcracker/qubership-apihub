import { useSnapshotPublications } from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import { RUNNING_STEP_STATUS, type StepStatus } from '../../ServicesPageProvider/servicesSteps'
import { useSnapshotPublicationDetails } from '../useAllPublicationDetails'
import { getCreateSnapshotStepStatus } from './snapshotPublications'
import { useIsCreatingSnapshot } from './useCreateSnapshot'

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

export function useIsCreateSnapshotStepRunning(): boolean {
  return useCreateSnapshotStepStatus() === RUNNING_STEP_STATUS
}
