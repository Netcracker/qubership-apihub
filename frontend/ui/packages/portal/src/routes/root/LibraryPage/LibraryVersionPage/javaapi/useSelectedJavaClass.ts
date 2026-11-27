import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { JavaApiClassListItem } from '@netcracker/qubership-apihub-api-doc-viewer'

export const JAVA_CLASS_SEARCH_PARAM = 'javaClass'
type SelectJavaClass = (className: string) => void

// Without a type in the URL the preview shows the first type, as the package detailed view does, and the URL stays
// as it is: a type in the URL means the user picked it
export function useSelectedJavaClass(
  filteredClasses: ReadonlyArray<JavaApiClassListItem>,
): [string | undefined, SelectJavaClass] {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedName = searchParams.get(JAVA_CLASS_SEARCH_PARAM)
  const selectedClassName = selectedName ?? filteredClasses[0]?.className
  const selectClass: SelectJavaClass = useCallback(className => {
    setSearchParams(params => {
      params.set(JAVA_CLASS_SEARCH_PARAM, className)
      return params
    }, { replace: true })
  }, [setSearchParams])

  return [selectedClassName, selectClass]
}
