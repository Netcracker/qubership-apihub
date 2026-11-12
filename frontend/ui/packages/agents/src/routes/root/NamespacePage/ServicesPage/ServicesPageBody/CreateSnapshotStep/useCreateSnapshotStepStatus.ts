import { useCreateSnapshotPublicationOptions } from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import { useAllPublishDetailsStatus } from '../useAllPublicationDetails'
import type { StepStatus } from '../../ServicesPageProvider/servicesSteps'

export function useCreateSnapshotStepStatus(): StepStatus {
  const { createSnapshotPublicationOptions: { config } } = useCreateSnapshotPublicationOptions()
  return useAllPublishDetailsStatus({ config })
}
