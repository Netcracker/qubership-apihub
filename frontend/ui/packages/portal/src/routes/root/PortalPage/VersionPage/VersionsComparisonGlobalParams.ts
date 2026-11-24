import { createContext, useContext } from 'react'
import type { ComparisonParams } from './useComparisonParams'

export const VersionsComparisonGlobalParamsContext = createContext<ComparisonParams>()

export function useVersionsComparisonGlobalParams(): ComparisonParams {
  return useContext(VersionsComparisonGlobalParamsContext) ?? {}
}
