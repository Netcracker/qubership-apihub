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

import { useEffect, useMemo } from 'react'
import { useSetSelectedOperationTags } from '../SelectedOperationTagsProvider'
import type { Operation } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DEFAULT_TAG } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { deduplicate } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

export function useSelectOperationTags(...operations: ReadonlyArray<Operation | null | undefined>): void {
  const operationsTags = useMemo(() => {
    const tags = operations
      .map(operation => operation?.tags ?? [])
      .reduce((allTagList, currentTagList) => [...allTagList, ...currentTagList])

    const tagSet = new Set<string>(tags)

    return tagSet.size === 0 ? [DEFAULT_TAG] : Array.from(tagSet)
  }, [operations])
  const setSelectedOperationTags = useSetSelectedOperationTags()

  useEffect(() => {
    operationsTags && setSelectedOperationTags(prevState => deduplicate([...prevState, ...operationsTags]))
  }, [setSelectedOperationTags, operationsTags])
}
