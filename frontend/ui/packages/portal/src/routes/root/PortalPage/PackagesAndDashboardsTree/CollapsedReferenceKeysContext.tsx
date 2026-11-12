import type { Dispatch, SetStateAction } from 'react'
import { createContext, useContext } from 'react'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

export const DashboardCollapsedReferenceKeysContext = createContext<Key[]>()
export const SetDashboardCollapsedReferenceKeysContext = createContext<Dispatch<SetStateAction<Key[]>>>()

export function useDashboardCollapsedReferenceKeys(): Key[] {
  return useContext(DashboardCollapsedReferenceKeysContext)
}

export function useSetDashboardCollapsedReferenceKeys(): Dispatch<SetStateAction<Key[]>> {
  return useContext(SetDashboardCollapsedReferenceKeysContext)
}
