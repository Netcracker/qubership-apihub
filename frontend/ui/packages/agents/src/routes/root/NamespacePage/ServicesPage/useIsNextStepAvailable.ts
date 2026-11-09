import { useHasPromotableServices } from './ServicesPageBody/CreateSnapshotStep/useHasPromotableServices'
import { COMPLETE_STEP_STATUS, CREATE_SNAPSHOT_STEP_KEY } from './ServicesPageProvider/servicesSteps'
import { useActiveStep, useSteps } from './ServicesPageProvider/ServicesStepsProvider'

// "Next" and the tab of the next step open that step under the same condition
export function useIsNextStepAvailable(): boolean {
  const steps = useSteps()
  const { key, index, status } = useActiveStep()
  // The snapshot details exist only once the snapshot is published
  const isSnapshotComplete = steps.some(
    step => step.key === CREATE_SNAPSHOT_STEP_KEY && step.status === COMPLETE_STEP_STATUS,
  )
  const hasPromotableServices = useHasPromotableServices(isSnapshotComplete)

  const isLastStep = index === steps.length - 1
  // Promote Version lists only the services of the snapshot that have a baseline package
  const isNextBlocked = key === CREATE_SNAPSHOT_STEP_KEY && !hasPromotableServices
  return !isLastStep && status === COMPLETE_STEP_STATUS && !isNextBlocked
}
