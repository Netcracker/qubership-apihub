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

import { useMemo } from 'react'
import type { OperationChangeData, PagedVersionChanges, VersionChanges } from '../../../entities/version-changelog'
import { EMPTY_CHANGES } from '../../../entities/version-changelog'

export function useFlatVersionChangelog(versionChangelog: PagedVersionChanges): VersionChanges {
  return useMemo<VersionChanges>(() => {
    const [firstPage] = versionChangelog
    if (!firstPage) {
      return EMPTY_CHANGES
    }
    const operations: OperationChangeData[] = [...firstPage.operations]
    const result: VersionChanges = {
      previousVersion: firstPage.previousVersion,
      previousVersionPackageKey: firstPage.previousVersionPackageKey,
      operations: operations,
    }
    versionChangelog.forEach((page, i) => {
      i > 0 && operations.push(...page.operations)
    })
    return result
  }, [versionChangelog])
}
