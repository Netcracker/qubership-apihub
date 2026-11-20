import { createContext, useContext } from 'react'

export const LevelContext = createContext<number>(0)

export function useLevelContext(): number {
  return useContext(LevelContext)
}