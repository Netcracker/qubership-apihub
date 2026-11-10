import { useHasPromotableServices } from './ServicesPageBody/CreateSnapshotStep/useHasPromotableServices'
import { SERVICES_DISCOVERY_VIEW, useDiscoveryView } from './ServicesPageBody/DiscoverServicesStep/useDiscoveryView'
import {
  COMPLETE_STEP_STATUS,
  CREATE_SNAPSHOT_STEP_KEY,
  DISCOVER_SERVICES_STEP_KEY,
} from './ServicesPageProvider/servicesSteps'
import { useActiveStep, useSteps } from './ServicesPageProvider/ServicesStepsProvider'

// "Next" and the tab of the next step open that step under the same condition
export function useIsNextStepAvailable(): boolean {
  const steps = useSteps()
  const { key, index, status } = useActiveStep()
  const discoveryView = useDiscoveryView()
  // The snapshot details exist only once the snapshot is published
  const isSnapshotComplete = steps.some(
    step => step.key === CREATE_SNAPSHOT_STEP_KEY && step.status === COMPLETE_STEP_STATUS,
  )
  const hasPromotableServices = useHasPromotableServices(isSnapshotComplete)

  const isLastStep = index === steps.length - 1
  // Create Snapshot lists the discovered services, so a discovery that found none leaves it nothing
  const isDiscoveryEmpty = key === DISCOVER_SERVICES_STEP_KEY && discoveryView !== SERVICES_DISCOVERY_VIEW
  // Promote Version lists only the services of the snapshot that have a baseline package
  const isSnapshotUnpromotable = key === CREATE_SNAPSHOT_STEP_KEY && !hasPromotableServices
  return !isLastStep && status === COMPLETE_STEP_STATUS && !isDiscoveryEmpty && !isSnapshotUnpromotable
}
