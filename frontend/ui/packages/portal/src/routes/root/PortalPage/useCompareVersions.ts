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

import { useEffect, useMemo, useState } from 'react'
import { useChangesSummary, useRefetchChangesSummary } from './VersionPage/VersionComparePage/useChangesSummary'
import { useVersionsComparisons } from './VersionPage/useVersionsComparisons'
import type { VersionChangesSummary } from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import { hasNoContent } from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { useChangesSummaryContext } from '@apihub/routes/root/PortalPage/VersionPage/ChangesSummaryProvider'

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

  const [refetchCounter, setRefetchCounter] = useState(0)
  const refetchChangesSummary = useRefetchChangesSummary()

  const [changesSummary, isContextValid, setChangesSummary] = useChangesSummaryContext(options)
  useEffect(() => {
    // if versions swapped, re-fetches counter must be reset
    if (!isContextValid) {
      setRefetchCounter(0)
    }
  }, [isContextValid])
  const [cachedChangesSummary, areChangesSummaryLoading, areChangesSummaryFetching, error] = useChangesSummary({
    packageKey: changedPackageKey!,
    versionKey: changedVersionKey!,
    previousVersionPackageKey: originPackageKey!,
    previousVersionKey: originVersionKey!,
  })
  const hasCache = useMemo(
    () => !!cachedChangesSummary && !error || areChangesSummaryLoading || areChangesSummaryFetching,
    [areChangesSummaryFetching, areChangesSummaryLoading, cachedChangesSummary, error],
  )
  const isCacheValid = useMemo(
    () => hasCache && !hasNoContent(cachedChangesSummary!),
    [cachedChangesSummary, hasCache],
  )

  if (isCacheValid && !changesSummary && isContextValid) {
    setChangesSummary(cachedChangesSummary)
  }

  const [versionsComparisons, areVersionChangesLoading, isSuccess] = useVersionsComparisons({
    hasCache: hasCache && isCacheValid,
    changedPackageKey: changedPackageKey,
    changedVersionKey: changedVersionKey,
    originPackageKey: originPackageKey,
    originVersionKey: originVersionKey,
  })

  if (
    refetchCounter < MAX_CHANGES_SUMMARY_REFETCHES &&
    !cachedChangesSummary &&
    !areChangesSummaryLoading &&
    versionsComparisons &&
    !areVersionChangesLoading &&
    isSuccess
  ) {
    refetchChangesSummary()
    setRefetchCounter(refetchCounter + 1)
  }

  return [changesSummary]
}
