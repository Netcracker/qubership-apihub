import { DETAILED_DISPLAY_MODE, DisplayMode } from "@apihub/types/DisplayMode"
import { OpenApiSelection } from "@apihub/utils/openapi/view-selection"
import { createContext, useContext } from "react"

/**
 * The operation viewer's view state, shared by every container: the layout of one level depends on
 * the selections and the collapsed sections of the levels below it (a Body's selected media type, or
 * a collapsed Body, decides where Request ends). Owned by `OperationNodeViewer`, reset when the
 * operation node changes. Design: docs/design/openapi/features/collapsible-sections.md,
 * docs/design/openapi/features/block-separators.md -> "Cost and collapsible blocks".
 */
export type OpenApiViewState = {
  readonly selection: OpenApiSelection
  readonly select: (ownerNodeId: string, selectedNodeId: string) => void
  /** Node ids of the collapsed 2nd-level sections; every section is expanded until toggled. */
  readonly collapsed: ReadonlySet<string>
  readonly toggleCollapsed: (sectionNodeId: string) => void
  /** The viewer's display mode: which rows exist (annotations are `detailed` only) shapes every level. */
  readonly displayMode: DisplayMode
}

export const OpenApiViewStateContext = createContext<OpenApiViewState>({
  selection: new Map(),
  select: () => undefined,
  collapsed: new Set(),
  toggleCollapsed: () => undefined,
  displayMode: DETAILED_DISPLAY_MODE,
})

export function useOpenApiViewState(): OpenApiViewState {
  return useContext(OpenApiViewStateContext)
}

/** Whether a collapsible section is expanded (the default). */
export function isOpenApiSectionExpanded(view: OpenApiViewState, sectionNodeId: string): boolean {
  return !view.collapsed.has(sectionNodeId)
}
