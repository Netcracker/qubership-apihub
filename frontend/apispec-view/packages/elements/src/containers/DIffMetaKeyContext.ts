import {createContext, useContext} from "react";

export const DiffMetaKeyContext = createContext<symbol | undefined>(undefined)

export function useDiffMetaKey(): symbol {
  return useContext(DiffMetaKeyContext)!
}