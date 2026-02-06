import {createContext, useContext} from "react";

export const AggregatedDiffsMetaKeyContext = createContext<symbol | undefined>(undefined)

export function useAggregatedDiffsMetaKey(): symbol {
  return useContext(AggregatedDiffsMetaKeyContext)!
}