import { NavigationLinkBuilder } from "@netcracker/qubership-apihub-next-data-model/shared/ddlapi/types/navigation-link-builder"
import { createContext, useContext } from "react"
import type { NavigationLinkComponent } from "./DefaultNavigationLink"

export type DdlTableViewerContextValue = {
  navigationLinkBuilder: NavigationLinkBuilder
  navigationLinkComponent: NavigationLinkComponent
}

export const DdlTableViewerContext = createContext<DdlTableViewerContextValue | null>(null)

export function useDdlTableViewerContext(): DdlTableViewerContextValue {
  const context = useContext(DdlTableViewerContext)
  if (!context) {
    throw new Error('useDdlTableViewerContext must be used within DdlTableViewer')
  }
  return context
}
