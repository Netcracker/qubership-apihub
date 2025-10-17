import {createContext, useContext} from "react";

export const AggregatedDiffMetaKeyContext = createContext<symbol | undefined>(undefined)

export function useAggregatedDiffMetaKey(): symbol {
  return useContext(AggregatedDiffMetaKeyContext)!
}