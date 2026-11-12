import type { FC } from 'react'
import { memo } from 'react'
import {
  useCreateSnapshotStep,
  useDiscoverServicesStep,
  usePromoteVersionStep,
  useValidationResultsStep,
} from '../ServicesPageProvider/ServicesStepsProvider'
import { DiscoverServicesStep } from './DiscoverServicesStep/DiscoverServicesStep'
import { CreateSnapshotStep } from './CreateSnapshotStep/CreateSnapshotStep'
import { ValidationResultsStep } from './ValidationResultsStep/ValidationResultsStep'
import { PromoteVersionStep } from './PromoteVersionStep/PromoteVersionStep'

export const ServicesPageBody: FC = memo(() => {
  const [discoverServicesStep] = useDiscoverServicesStep()
  const [createSnapshotStep] = useCreateSnapshotStep()
  const [validationResultsStep] = useValidationResultsStep()
  const [promoteVersionStep] = usePromoteVersionStep()

  if (discoverServicesStep.active) {
    return (
      <DiscoverServicesStep/>
    )
  }

  if (createSnapshotStep.active) {
    return (
      <CreateSnapshotStep/>
    )
  }

  if (validationResultsStep.active) {
    return (
      <ValidationResultsStep/>
    )
  }

  if (promoteVersionStep.active) {
    return (
      <PromoteVersionStep/>
    )
  }

  return null
})
