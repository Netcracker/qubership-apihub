import { DiffType } from "@netcracker/qubership-apihub-api-diff";
import { createContext, useContext } from "react";

export const DiffTypesContext = createContext<ReadonlyArray<DiffType> | undefined>(undefined)

export function useDiffTypes(): ReadonlyArray<DiffType> | undefined {
  return useContext(DiffTypesContext)
}
