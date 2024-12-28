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

import type { Dispatch, SetStateAction } from 'react'
import { useEffect } from 'react'
import { useSelectedOperationTags } from './SelectedOperationTagsProvider'
import { useSetShouldAutoExpandTagsContext, useShouldAutoExpandTagsContext } from './ShouldAutoExpandTagsProvider'

export function useAutoExpandTags(
  expanded: readonly string[],
  setExpanded: Dispatch<SetStateAction<readonly string[]>>,
  searchValue: string,
  tags: string[],
): void {
  const selectedOperationTags = useSelectedOperationTags()
  const shouldAutoExpand = useShouldAutoExpandTagsContext()
  const setShouldAutoExpand = useSetShouldAutoExpandTagsContext()

  useEffect(() => {
    if (tags && searchValue) {
      setShouldAutoExpand(true)
      setExpanded(tags)
    } else if (shouldAutoExpand && selectedOperationTags) {
      setExpanded(selectedOperationTags)
    }
  }, [searchValue, selectedOperationTags, setExpanded, setShouldAutoExpand, shouldAutoExpand, tags])
}
