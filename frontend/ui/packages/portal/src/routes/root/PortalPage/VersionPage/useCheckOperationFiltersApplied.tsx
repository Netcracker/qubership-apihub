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

import { useDefaultOperationFilterControllers } from './useDefaultOperationFilterControllers'
import { useTagSearchFilter } from './useTagSearchFilter'
import { useMemo } from 'react'
import { ALL_OPERATION_GROUPS } from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'
import { ALL_API_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/operations'

export function useCheckOperationFiltersApplied(isDashboard: boolean): boolean {
  const {
    selectedPackageKey,
    selectedOperationGroupName,
    selectedApiKind,
  } = useDefaultOperationFilterControllers(isDashboard)
  const [tag] = useTagSearchFilter()

  return useMemo(
    () => !!selectedPackageKey || selectedOperationGroupName !== ALL_OPERATION_GROUPS || selectedApiKind !== ALL_API_KIND || !!tag,
    [selectedApiKind, selectedOperationGroupName, selectedPackageKey, tag],
  )
}
