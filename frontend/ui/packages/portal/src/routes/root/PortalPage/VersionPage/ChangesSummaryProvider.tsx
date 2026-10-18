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
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { UseCompareVersionsOptions } from '../useCompareVersions'
import type { VersionChangesSummary } from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'

const ChangesSummaryContext = createContext<VersionChangesSummary | undefined>()
const SetChangesSummaryContext = createContext<Dispatch<SetStateAction<VersionChangesSummary | undefined>>>()

const VersionsComparisonOptions = createContext<UseCompareVersionsOptions | undefined>()
const SetVersionsComparisonOptions = createContext<Dispatch<SetStateAction<UseCompareVersionsOptions | undefined>>>()

export function useChangesSummaryFromContext(): VersionChangesSummary | undefined {
  return useContext(ChangesSummaryContext)
}

function useIsChangesSummaryContextValid(
  actualComparisonOptions: UseCompareVersionsOptions,
): boolean {
  const comparisonOptionsFromContext = useVersionsComparisonOptions()

  return useMemo(
    () => {
      const actual = actualComparisonOptions
      const saved = comparisonOptionsFromContext
      return actual.changedPackageKey === saved?.changedPackageKey &&
        actual.changedVersionKey === saved?.changedVersionKey &&
        actual.originPackageKey === saved?.originPackageKey &&
        actual.originVersionKey === saved?.originVersionKey &&
        actual.currentGroup === saved?.currentGroup &&
        actual.previousGroup === saved?.previousGroup
    },
    [actualComparisonOptions, comparisonOptionsFromContext],
  )
}

function useSetChangesSummaryContext(): Dispatch<SetStateAction<VersionChangesSummary | undefined>> {
  return useContext(SetChangesSummaryContext)
}

function useVersionsComparisonOptions(): UseCompareVersionsOptions | undefined {
  return useContext(VersionsComparisonOptions)
}

function useSetVersionsComparisonOptions(): Dispatch<SetStateAction<UseCompareVersionsOptions | undefined>> {
  return useContext(SetVersionsComparisonOptions)
}

export function useChangesSummaryContext(
  actualComparisonOptions: UseCompareVersionsOptions,
): [VersionChangesSummary | undefined, boolean, Dispatch<SetStateAction<VersionChangesSummary | undefined>>] {
  const setVersionsComparisonOptions = useSetVersionsComparisonOptions()
  const changesSummaryFromContext = useChangesSummaryFromContext()
  const setChangesSummary = useSetChangesSummaryContext()

  const isContextValid = useIsChangesSummaryContextValid(actualComparisonOptions)

  // Update context state when validation changes - side effects in useEffect, not useMemo
  useEffect(() => {
    if (!isContextValid) {
      setVersionsComparisonOptions(actualComparisonOptions)
      setChangesSummary(undefined)
    }
  }, [isContextValid, actualComparisonOptions, setVersionsComparisonOptions, setChangesSummary])

  // Pure calculation without side effects
  const changesSummary = useMemo(() => {
    return isContextValid ? changesSummaryFromContext : undefined
  }, [isContextValid, changesSummaryFromContext])

  return [changesSummary, isContextValid, setChangesSummary]
}

export const ChangesSummaryProvider: FC<PropsWithChildren> = ({ children }) => {
  const [changesSummary, setChangesSummary] = useState<VersionChangesSummary | undefined>()
  const [comparisonOptions, setComparisonOptions] = useState<UseCompareVersionsOptions | undefined>()

  return (
    <VersionsComparisonOptions.Provider value={comparisonOptions}>
      <SetVersionsComparisonOptions.Provider value={setComparisonOptions}>
        <ChangesSummaryContext.Provider value={changesSummary}>
          <SetChangesSummaryContext.Provider value={setChangesSummary}>
            {children}
          </SetChangesSummaryContext.Provider>
        </ChangesSummaryContext.Provider>
      </SetVersionsComparisonOptions.Provider>
    </VersionsComparisonOptions.Provider>
  )
}
