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
