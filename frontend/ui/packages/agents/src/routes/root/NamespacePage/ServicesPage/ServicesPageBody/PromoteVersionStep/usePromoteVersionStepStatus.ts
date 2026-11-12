import { useAllPublishDetailsStatus } from '../useAllPublicationDetails'
import type { StepStatus } from '../../ServicesPageProvider/servicesSteps'
import { usePromoteVersionPublicationOptions } from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'

export function usePromoteVersionStepStatus(): StepStatus {
  const { promotePublicationOptions: { config } } = usePromoteVersionPublicationOptions()
  return useAllPublishDetailsStatus({ config })
}
