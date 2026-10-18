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

import { useChangesSummaryContext } from '@apihub/routes/root/PortalPage/VersionPage/ChangesSummaryProvider'
import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { VersionChangesSummary } from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import { hasNoContent } from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import { useEffect, useMemo, useRef } from 'react'
import { useChangesSummary } from './VersionPage/VersionComparePage/useChangesSummary'
import { useVersionsComparisons } from './VersionPage/useVersionsComparisons'

export type UseCompareVersionsOptions = Partial<{
  changedPackageKey: Key
  changedVersionKey: VersionKey
  originPackageKey: Key
  originVersionKey: VersionKey
  currentGroup?: Key
  previousGroup?: Key
}>

const MAX_CHANGES_SUMMARY_REFETCHES = 3

export function useCompareVersions(options: UseCompareVersionsOptions): [VersionChangesSummary | undefined] {
  const {
    changedPackageKey,
    changedVersionKey,
    originPackageKey,
    originVersionKey,
  } = options

  const refetchCounter = useRef(MAX_CHANGES_SUMMARY_REFETCHES)

  const [changesSummaryFromContext, isContextValid, saveChangesSummaryToContext] = useChangesSummaryContext(options)

  useEffect(() => {
    // if versions swapped, re-fetches counter must be reset
    if (!isContextValid) {
      refetchCounter.current = MAX_CHANGES_SUMMARY_REFETCHES
    }
  }, [isContextValid])

  const {
    data: changesSummaryFromBackend,
    isLoading: areChangesSummaryLoading,
    isFetching: areChangesSummaryFetching,
    error,
    refetch: refetchChangesSummary,
  } = useChangesSummary({
    packageKey: changedPackageKey!,
    versionKey: changedVersionKey!,
    previousVersionPackageKey: originPackageKey!,
    previousVersionKey: originVersionKey!,
  })
  const hasChangesSummaryOnBackend = useMemo(
    () => !!changesSummaryFromBackend && !error || areChangesSummaryLoading || areChangesSummaryFetching,
    [areChangesSummaryFetching, areChangesSummaryLoading, changesSummaryFromBackend, error],
  )
  const isChangesSummaryOnBackendValid = useMemo(
    () => hasChangesSummaryOnBackend && !!changesSummaryFromBackend && !hasNoContent(changesSummaryFromBackend),
    [changesSummaryFromBackend, hasChangesSummaryOnBackend],
  )

  useEffect(() => {
    if (isChangesSummaryOnBackendValid && !changesSummaryFromContext && isContextValid) {
      saveChangesSummaryToContext(changesSummaryFromBackend)
    }
  }, [changesSummaryFromBackend, changesSummaryFromContext, isChangesSummaryOnBackendValid, isContextValid, saveChangesSummaryToContext])

  const [versionsComparisons, areVersionChangesLoading, isSuccess] = useVersionsComparisons({
    hasCache: hasChangesSummaryOnBackend && isChangesSummaryOnBackendValid,
    changedPackageKey: changedPackageKey,
    changedVersionKey: changedVersionKey,
    originPackageKey: originPackageKey,
    originVersionKey: originVersionKey,
  })

  useEffect(
    () => {
      if (
        refetchCounter.current > 0 &&
        !changesSummaryFromBackend &&
        !areChangesSummaryLoading &&
        versionsComparisons &&
        !areVersionChangesLoading &&
        isSuccess
      ) {
        refetchChangesSummary()
        refetchCounter.current--
      }
    },
    [
      areChangesSummaryLoading,
      areVersionChangesLoading,
      changesSummaryFromBackend,
      isSuccess,
      refetchChangesSummary,
      versionsComparisons,
    ],
  )

  return useMemo(
    () => ([changesSummaryFromContext]),
    [changesSummaryFromContext],
  )
}
