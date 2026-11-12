import { DiffType } from '@netcracker/qubership-apihub-api-diff'
import { createContext, useContext } from 'react'

export const ChangeSeverityFiltersContext = createContext<readonly DiffType[]>([])

export function useChangeSeverityFilters(): readonly DiffType[] {
  return useContext(ChangeSeverityFiltersContext)
}