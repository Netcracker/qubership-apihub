import { createContext, useContext } from "react";
import { DiffType } from "@netcracker/qubership-apihub-api-diff";

export const ChangeSeverityFiltersContext = createContext<DiffType[]>([])

export function useChangeSeverityFilters(): DiffType[] {
  return useContext(ChangeSeverityFiltersContext)
}