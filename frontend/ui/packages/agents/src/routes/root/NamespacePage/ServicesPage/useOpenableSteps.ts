import { useHasPromotableServices } from './ServicesPageBody/CreateSnapshotStep/useHasPromotableServices'
import { SERVICES_DISCOVERY_VIEW, useDiscoveryView } from './ServicesPageBody/DiscoverServicesStep/useDiscoveryView'
import {
  COMPLETE_STEP_STATUS,
  CREATE_SNAPSHOT_STEP_KEY,
  DISCOVER_SERVICES_STEP_KEY,
  openableStepsOf,
  PROMOTE_VERSION_STEP_KEY,
  type Step,
} from './ServicesPageProvider/servicesSteps'
import { useSteps } from './ServicesPageProvider/ServicesStepsProvider'

/**
 * Whether each step can open, by index. The tabs and "Next" share it: "Next" opens the step after the open one when
 * that step can open.
 */
export function useOpenableSteps(): ReadonlyArray<boolean> {
  const steps = useSteps()
  const discoveryView = useDiscoveryView()
  // The snapshot details exist only once the snapshot is published
  const isSnapshotComplete = steps.some(
    step => step.key === CREATE_SNAPSHOT_STEP_KEY && step.status === COMPLETE_STEP_STATUS,
  )
  const hasPromotableServices = useHasPromotableServices(isSnapshotComplete)

  const isLeavable = ({ key, status }: Step): boolean => {
    if (status !== COMPLETE_STEP_STATUS) {
      return false
    }
    switch (key) {
      // Create Snapshot lists the discovered services, so a discovery that found none leaves it nothing
      case DISCOVER_SERVICES_STEP_KEY:
        return discoveryView === SERVICES_DISCOVERY_VIEW
      // Promote Version lists only the services of the snapshot that have a baseline package
      case CREATE_SNAPSHOT_STEP_KEY:
        return hasPromotableServices
      case PROMOTE_VERSION_STEP_KEY:
        return false
    }
  }

  return openableStepsOf(steps, isLeavable)
}
