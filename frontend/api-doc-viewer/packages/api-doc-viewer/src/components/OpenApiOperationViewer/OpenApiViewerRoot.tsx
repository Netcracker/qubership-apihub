import { cn } from '@apihub/utils/common/cn'
import { DisplayModeContext } from "@apihub/contexts/DisplayModeContext"
import { LayoutModeContext } from "@apihub/contexts/LayoutModeContext"
import { LayoutSpacingContext } from "@apihub/contexts/LayoutSpacingContext"
import { LevelContext } from "@apihub/contexts/LevelContext"
import { DisplayMode } from "@apihub/types/DisplayMode"
import { LayoutMode } from "@apihub/types/LayoutMode"
import { OpenApiSpacing, OpenApiSpacingConfig } from "@netcracker/qubership-apihub-next-data-model/model/openapi/layout"
import { CSSProperties, FC } from "react"
import { OpenApiViewerContext, OpenApiViewerContextValue } from "./OpenApiViewerContext"
import { OperationNode, OperationNodeViewer } from "./OperationNodeViewer"

type OpenApiViewerRootProps = {
  operation: OperationNode
  noHeading: boolean
  viewerContext: OpenApiViewerContextValue
  displayMode: DisplayMode
  layoutMode: LayoutMode
  testId: string
}

/**
 * What both OpenAPI root viewers render once their tree is built: the common contexts (viewer
 * context, display / layout mode, level, layout spacing) and the root element carrying the spacing
 * numbers as CSS custom properties. The diffs root wraps it in its diff contexts.
 * Design: docs/design/openapi/features/operation-viewer.md -> "Root component shape".
 */
export const OpenApiViewerRoot: FC<OpenApiViewerRootProps> = ({ operation, noHeading, viewerContext, displayMode, layoutMode, testId }) => (
  <OpenApiViewerContext.Provider value={viewerContext}>
    <DisplayModeContext.Provider value={displayMode}>
      <LayoutModeContext.Provider value={layoutMode}>
        <LevelContext.Provider value={0}>
          <LayoutSpacingContext.Provider value={viewerContext.spacing}>
            <div className={cn('root')} data-testid={testId} style={toOpenApiCssVariables(viewerContext.spacing)}>
              <OperationNodeViewer node={operation} noHeading={noHeading} />
            </div>
          </LayoutSpacingContext.Provider>
        </LevelContext.Provider>
      </LayoutModeContext.Provider>
    </DisplayModeContext.Provider>
  </OpenApiViewerContext.Provider>
)

/**
 * The spacing numbers the OpenAPI CSS reads (`preceded-by.css`, `TitleRow.css`,
 * `CollapsibleSection.css`): the only place they are written; the CSS has no fallbacks.
 */
function toOpenApiCssVariables(spacing: OpenApiSpacingConfig): CSSProperties {
  return {
    '--separator-layout-nested-viewer-inset': `${spacing.nestedViewerInset}px`,
    '--collapsible-section-expander-width': `${spacing.sectionExpander.width}px`,
    '--openapi-section-content-indent': `${OpenApiSpacing.sectionContentIndent(spacing)}px`,
  }
}
