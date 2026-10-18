/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
