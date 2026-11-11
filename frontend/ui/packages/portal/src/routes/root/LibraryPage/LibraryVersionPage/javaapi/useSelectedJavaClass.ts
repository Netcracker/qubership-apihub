import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { JavaApiClassListItem } from '@netcracker/qubership-apihub-api-doc-viewer'

export const JAVA_CLASS_SEARCH_PARAM = 'javaClass'
type SelectJavaClass = (className: string) => void

export function useSelectedJavaClass(
  classes: ReadonlyArray<JavaApiClassListItem>,
  filteredClasses: ReadonlyArray<JavaApiClassListItem>,
): [JavaApiClassListItem | undefined, SelectJavaClass] {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedName = searchParams.get(JAVA_CLASS_SEARCH_PARAM)
  const selectedClass = classes.find(({ className }) => className === selectedName) ?? filteredClasses[0]
  const selectClass: SelectJavaClass = useCallback(className => {
    setSearchParams(params => {
      params.set(JAVA_CLASS_SEARCH_PARAM, className)
      return params
    }, { replace: true })
  }, [setSearchParams])

  useEffect(() => {
    if (selectedClass && selectedClass.className !== selectedName) selectClass(selectedClass.className)
  }, [selectedClass, selectedName, selectClass])

  return [selectedClass, selectClass]
}
