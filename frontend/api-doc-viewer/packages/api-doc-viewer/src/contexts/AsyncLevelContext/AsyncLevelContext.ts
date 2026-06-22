import { createContext, useContext } from "react"

export type AsyncLevelContextValue = {
  beforeLevel: number
  afterLevel: number
}

export const AsyncLevelContext = createContext<AsyncLevelContextValue | undefined>(undefined)

export function useAsyncLevelContext(): AsyncLevelContextValue | undefined {
  return useContext(AsyncLevelContext)
}