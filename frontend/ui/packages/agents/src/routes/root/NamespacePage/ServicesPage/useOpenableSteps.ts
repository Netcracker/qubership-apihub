import { useHasPromotableServices } from './ServicesPageBody/CreateSnapshotStep/useHasPromotableServices'
import { SERVICES_DISCOVERY_VIEW, useDiscoveryView } from './ServicesPageBody/DiscoverServicesStep/useDiscoveryView'
import {
  COMPLETE_STEP_STATUS,
  CREATE_SNAPSHOT_STEP_KEY,
  DISCOVER_SERVICES_STEP_KEY,
  openableStepsOf,
  PROMOTE_VERSION_STEP_KEY,
  type Step,
  type StepKey,
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

  const isLeavableByStepKey: Record<StepKey, boolean> = {
    // Create Snapshot lists the discovered services, so a discovery that found none leaves it nothing
    [DISCOVER_SERVICES_STEP_KEY]: discoveryView === SERVICES_DISCOVERY_VIEW,
    // Promote Version lists only the services of the snapshot that have a baseline package
    [CREATE_SNAPSHOT_STEP_KEY]: hasPromotableServices,
    [PROMOTE_VERSION_STEP_KEY]: false,
  }
  const isLeavable = ({ key, status }: Step): boolean => status === COMPLETE_STEP_STATUS && isLeavableByStepKey[key]

  return openableStepsOf(steps, isLeavable)
}
