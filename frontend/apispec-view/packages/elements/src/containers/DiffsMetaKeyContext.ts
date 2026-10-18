import { createContext, useContext } from "react";

export const DiffsMetaKeyContext = createContext<symbol | undefined>(undefined)

export function useDiffsMetaKey(): symbol {
  return useContext(DiffsMetaKeyContext)!
}