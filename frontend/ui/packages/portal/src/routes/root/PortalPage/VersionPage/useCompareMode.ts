import { useLocation } from 'react-use'
import { useParams } from 'react-router-dom'

export const COMPARE_MODE = 'compare'

export function useIsCompareMode(): boolean {
  const { pathname } = useLocation()
  const items = pathname?.split('/') ?? []
  const compareLocationIndex = 5
  return items[compareLocationIndex] === COMPARE_MODE
}

export function useIsCompareSameOperations(): boolean {
  const { operationId } = useParams()
  return useIsCompareMode() && operationId !== undefined
}
