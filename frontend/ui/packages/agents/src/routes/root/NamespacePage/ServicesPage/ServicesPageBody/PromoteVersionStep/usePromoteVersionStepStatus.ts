import { useAllPublishDetailsStatus } from '../useAllPublicationDetails'
import { PUBLISH_STATUS_TO_STEP_STATUS_MAP } from '../../../constants'
import type { StepStatus } from '../../ServicesPageProvider/ServicesStepsProvider'
import { usePromoteVersionPublicationOptions } from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'

export function usePromoteVersionStepStatus(): StepStatus {
  const { promotePublicationOptions: { config } } = usePromoteVersionPublicationOptions()
  const status = useAllPublishDetailsStatus({ config })
  return PUBLISH_STATUS_TO_STEP_STATUS_MAP[status]
}
