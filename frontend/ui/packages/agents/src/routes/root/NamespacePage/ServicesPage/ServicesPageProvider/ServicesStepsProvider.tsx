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

import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, memo, useContext, useState } from 'react'

export const ServicesStepsProvider: FC<PropsWithChildren> = memo(({ children }) => {
  const [discoverServicesStep, setDiscoverServicesStep] = useState<Step>(INITIAL_DISCOVER_SERVICES_STEP)
  const [createSnapshotStep, setCreateSnapshotStep] = useState<Step>(INITIAL_CREATE_SNAPSHOT_STEP)
  const [validationResultsStep, setValidationResultsStep] = useState<Step>(INITIAL_VALIDATION_RESULTS_STEP)
  const [promoteVersionStep, setPromoteVersionStep] = useState<Step>(INITIAL_PROMOTE_VERSION_STEP)

  return (
    <DiscoverServicesStepContext.Provider value={discoverServicesStep}>
      <SetDiscoverServicesStepContext.Provider value={setDiscoverServicesStep}>
        <CreateSnapshotStepContext.Provider value={createSnapshotStep}>
          <SetCreateSnapshotStepContext.Provider value={setCreateSnapshotStep}>
            <ValidationResultsStepContext.Provider value={validationResultsStep}>
              <SetValidationResultsStepContext.Provider value={setValidationResultsStep}>
                <PromoteVersionStepContext.Provider value={promoteVersionStep}>
                  <SetPromoteVersionStepContext.Provider value={setPromoteVersionStep}>
                    {children}
                  </SetPromoteVersionStepContext.Provider>
                </PromoteVersionStepContext.Provider>
              </SetValidationResultsStepContext.Provider>
            </ValidationResultsStepContext.Provider>
          </SetCreateSnapshotStepContext.Provider>
        </CreateSnapshotStepContext.Provider>
      </SetDiscoverServicesStepContext.Provider>
    </DiscoverServicesStepContext.Provider>
  )
})

const DiscoverServicesStepContext = createContext<Step>()
const SetDiscoverServicesStepContext = createContext<Dispatch<SetStateAction<Step>>>()

export function useDiscoverServicesStep(): [Step, Dispatch<SetStateAction<Step>>] {
  const step = useContext(DiscoverServicesStepContext)
  const setStep = useContext(SetDiscoverServicesStepContext)
  return [step, setStep]
}

const CreateSnapshotStepContext = createContext<Step>()
const SetCreateSnapshotStepContext = createContext<Dispatch<SetStateAction<Step>>>()

export function useCreateSnapshotStep(): [Step, Dispatch<SetStateAction<Step>>] {
  const step = useContext(CreateSnapshotStepContext)
  const setStep = useContext(SetCreateSnapshotStepContext)
  return [step, setStep]
}

const ValidationResultsStepContext = createContext<Step>()
const SetValidationResultsStepContext = createContext<Dispatch<SetStateAction<Step>>>()

export function useValidationResultsStep(): [Step, Dispatch<SetStateAction<Step>>] {
  const step = useContext(ValidationResultsStepContext)
  const setStep = useContext(SetValidationResultsStepContext)
  return [step, setStep]
}

const PromoteVersionStepContext = createContext<Step>()
const SetPromoteVersionStepContext = createContext<Dispatch<SetStateAction<Step>>>()

export function usePromoteVersionStep(): [Step, Dispatch<SetStateAction<Step>>] {
  const step = useContext(PromoteVersionStepContext)
  const setStep = useContext(SetPromoteVersionStepContext)
  return [step, setStep]
}

export type Step = Readonly<{
  key: StepKey
  index: number
  name: string
  status: StepStatus
  active: boolean
}>

export const DISCOVER_SERVICES_STEP_KEY = 'discover-services'
export const CREATE_SNAPSHOT_STEP_KEY = 'create-snapshot'
export const VALIDATION_RESULTS_STEP_KEY = 'validation-results'
export const PROMOTE_VERSION_STEP_KEY = 'promote-version'

export type StepKey =
  | typeof DISCOVER_SERVICES_STEP_KEY
  | typeof CREATE_SNAPSHOT_STEP_KEY
  | typeof VALIDATION_RESULTS_STEP_KEY
  | typeof PROMOTE_VERSION_STEP_KEY

export const INITIAL_STEP_STATUS = 'initial'
export const RUNNING_STEP_STATUS = 'running'
export const SUCCESS_STEP_STATUS = 'success'
export const ERROR_STEP_STATUS = 'error'

export type StepStatus =
  | typeof INITIAL_STEP_STATUS
  | typeof RUNNING_STEP_STATUS
  | typeof SUCCESS_STEP_STATUS
  | typeof ERROR_STEP_STATUS

const INITIAL_DISCOVER_SERVICES_STEP: Step = {
  key: DISCOVER_SERVICES_STEP_KEY,
  index: 0,
  name: 'Discover Services',
  status: INITIAL_STEP_STATUS,
  active: true,
}

const INITIAL_CREATE_SNAPSHOT_STEP: Step = {
  key: CREATE_SNAPSHOT_STEP_KEY,
  index: 1,
  name: 'Create Snapshot',
  status: INITIAL_STEP_STATUS,
  active: false,
}

const INITIAL_VALIDATION_RESULTS_STEP: Step = {
  key: VALIDATION_RESULTS_STEP_KEY,
  index: 2,
  name: 'Validation Results',
  status: INITIAL_STEP_STATUS,
  active: false,
}

const INITIAL_PROMOTE_VERSION_STEP: Step = {
  key: PROMOTE_VERSION_STEP_KEY,
  index: 3,
  name: 'Promote Version',
  status: INITIAL_STEP_STATUS,
  active: false,
}
