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

import {
  createContext,
  type Dispatch,
  type FC,
  memo,
  type PropsWithChildren,
  type SetStateAction,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

import {
  INITIAL_STEPS_STATE,
  type Step,
  type StepKey,
  type StepsState,
  type StepStatus,
  toSteps,
  withStepOpened,
  withStepsResetAfter,
  withStepStatus,
} from './servicesSteps'

type OpenStep = (key: StepKey) => void
type ResetStepsAfter = (key: StepKey) => void
type SetStepStatus = (key: StepKey, status: StepStatus) => void

export const ServicesStepsProvider: FC<PropsWithChildren> = memo(({ children }) => {
  const [state, setState] = useState<StepsState>(INITIAL_STEPS_STATE)

  return (
    <StepsStateContext.Provider value={state}>
      <SetStepsStateContext.Provider value={setState}>
        {children}
      </SetStepsStateContext.Provider>
    </StepsStateContext.Provider>
  )
})

const StepsStateContext = createContext<StepsState>()
const SetStepsStateContext = createContext<Dispatch<SetStateAction<StepsState>>>()

export function useSteps(): ReadonlyArray<Step> {
  const state = useContext(StepsStateContext)
  return useMemo(() => toSteps(state), [state])
}

export function useActiveStep(): Step {
  const steps = useSteps()
  const { activeStepIndex } = useContext(StepsStateContext)
  return steps[activeStepIndex]
}

export function useOpenStep(): OpenStep {
  const setState = useContext(SetStepsStateContext)
  return useCallback<OpenStep>(key => setState(state => withStepOpened(state, key)), [setState])
}

export function useResetStepsAfter(): ResetStepsAfter {
  const setState = useContext(SetStepsStateContext)
  return useCallback<ResetStepsAfter>(key => setState(state => withStepsResetAfter(state, key)), [setState])
}

export function useSetStepStatus(): SetStepStatus {
  const setState = useContext(SetStepsStateContext)
  return useCallback<SetStepStatus>(
    (key, status) => setState(state => withStepStatus(state, key, status)),
    [setState],
  )
}
