import { useEffect, useMemo } from 'react'
import { useSetSelectedOperationTags } from '../SelectedOperationTagsProvider'
import type { Operation } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DEFAULT_TAG } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { deduplicate } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

export function useSelectOperationTags(...operations: ReadonlyArray<Operation | null | undefined>): void {
  const operationsTags = useMemo(() => {
    const tags = operations
      .map(operation => operation?.tags ?? [])
      .reduce((allTagList, currentTagList) => [...allTagList, ...currentTagList], [])

    const tagSet = new Set<string>(tags)

    return tagSet.size === 0 ? [DEFAULT_TAG] : Array.from(tagSet)
  }, [operations])

  const setSelectedOperationTags = useSetSelectedOperationTags()

  useEffect(() => {
    operationsTags && setSelectedOperationTags(prevState => deduplicate([...prevState, ...operationsTags]))
  }, [setSelectedOperationTags, operationsTags])
}
