import { useCreateSnapshotPublicationOptions } from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import { useAllPublishDetailsStatus } from '../useAllPublicationDetails'
import { PUBLISH_STATUS_TO_STEP_STATUS_MAP } from '../../../constants'
import type { StepStatus } from '../../ServicesPageProvider/ServicesStepsProvider'

export function useCreateSnapshotStepStatus(): StepStatus {
  const { createSnapshotPublicationOptions: { config } } = useCreateSnapshotPublicationOptions()
  const status = useAllPublishDetailsStatus({ config })
  return PUBLISH_STATUS_TO_STEP_STATUS_MAP[status]
}
