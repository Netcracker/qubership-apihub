import { DEFAULT_DISPLAY_MODE } from "@apihub/constants/configuration"
import { DiffMetaKeysContext } from "@apihub/contexts/DiffMetaKeysContext"
import { DiffTypesContext } from "@apihub/contexts/DiffTypesContext"
import { DisplayMode } from "@apihub/types/DisplayMode"
import { SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "@apihub/types/LayoutMode"
import { isOpenApiOperationNode } from "@apihub/utils/openapi/node-type-checkers"
import { DiffType } from "@netcracker/qubership-apihub-api-diff"
import { createOpenApiLogger, OpenApiTreeWithDiffsBuilder } from "@netcracker/qubership-apihub-next-data-model"
import { DEFAULT_OPENAPI_SPACING_CONFIG } from "@netcracker/qubership-apihub-next-data-model/model/openapi/layout"
import { OpenApiOperationKeys } from "@netcracker/qubership-apihub-next-data-model/shared/openapi/types/operation-keys"
import { FC, memo, useMemo } from "react"
import '../../index.css'
import { DiffMetaKeys } from "../../types/DiffMetaKeys"
import { ErrorBoundary } from "../services/ErrorBoundary"
import { ErrorBoundaryFallback } from "../services/ErrorBoundaryFallback"
import { resolveDiffsNodesVisibilityMode } from "../shared-components/ShowUnchangedRow/DiffsNodesVisibilityMode"
import { UnchangedBlocksContext, useUnchangedBlocksContextValue } from "../shared-components/ShowUnchangedRow/UnchangedBlocksContext"
import '../shared-styles/diffs/index.css'
import { OpenApiViewerContextValue } from "./OpenApiViewerContext"
import { OpenApiViewerRoot } from "./OpenApiViewerRoot"

export type OpenApiOperationDiffsViewerProps = {
  /** Merged `apiDiff` document of two whole OpenAPI documents (`components` kept). */
  mergedSource: unknown
  /** Key of the MERGED document: the after path of a renamed path. */
  operationKeys?: OpenApiOperationKeys
  displayMode?: DisplayMode
  devMode?: boolean
  noHeading?: boolean
  expandedDepth?: number
  // diffs specific
  diffMetaKeys: DiffMetaKeys
  /** Accepted and forwarded; diff-type filters are not implemented yet. */
  diffTypes?: ReadonlyArray<DiffType>
  /**
   * Hide unchanged content (default `true`): forwarded to nested `JsonSchemaDiffsViewer`s, and a
   * security scheme card without content changes shows only its title row plus a "three dots" row.
   * Design: docs/design/openapi/features/hiding-unchanged-nodes.md
   */
  hideUnchangedNodes?: boolean
}

/**
 * One OpenAPI operation of a merged document, side by side.
 * Design: docs/design/openapi/features/diffs.md
 */
export const OpenApiOperationDiffsViewer: FC<OpenApiOperationDiffsViewerProps> = memo<OpenApiOperationDiffsViewerProps>(props => {
  if (props.mergedSource === null) {
    return null
  }
  return (
    <ErrorBoundary fallback={<ErrorBoundaryFallback componentName="OpenAPI Operation Viewer" />}>
      <OpenApiOperationDiffsViewerInner {...props} />
    </ErrorBoundary>
  )
})

const OpenApiOperationDiffsViewerInner: FC<OpenApiOperationDiffsViewerProps> = memo<OpenApiOperationDiffsViewerProps>(props => {
  const {
    mergedSource,
    operationKeys,
    displayMode = DEFAULT_DISPLAY_MODE,
    devMode = false,
    noHeading = false,
    expandedDepth,
    diffMetaKeys,
    diffTypes,
    hideUnchangedNodes = true,
  } = props

  const logger = useMemo(() => createOpenApiLogger(devMode), [devMode])
  const treeBuilder = useMemo(
    () => new OpenApiTreeWithDiffsBuilder({ source: mergedSource, operationKeys, diffsMetaKeys: diffMetaKeys, logger }),
    [mergedSource, operationKeys, diffMetaKeys, logger],
  )
  const tree = useMemo(() => treeBuilder.build(), [treeBuilder])
  const visibilityMode = useMemo(() => resolveDiffsNodesVisibilityMode(hideUnchangedNodes), [hideUnchangedNodes])
  const unchangedBlocksContext = useUnchangedBlocksContextValue(visibilityMode)
  const viewerContext: OpenApiViewerContextValue = useMemo(
    () => ({ devMode, expandedDepth, hideUnchangedNodes, spacing: DEFAULT_OPENAPI_SPACING_CONFIG }),
    [devMode, expandedDepth, hideUnchangedNodes],
  )

  logger.debug('[OpenAPI Diffs] Merged source:', mergedSource)
  logger.debug('[OpenAPI Diffs] Tree:', tree)

  const operationNode = tree.root
  if (!isOpenApiOperationNode(operationNode)) {
    return null
  }

  return (
    <DiffMetaKeysContext.Provider value={diffMetaKeys}>
      <DiffTypesContext.Provider value={diffTypes}>
        <UnchangedBlocksContext.Provider value={unchangedBlocksContext}>
          <OpenApiViewerRoot
            operation={operationNode}
            noHeading={noHeading}
            viewerContext={viewerContext}
            displayMode={displayMode}
            layoutMode={SIDE_BY_SIDE_DIFFS_LAYOUT_MODE}
            testId="openapi-operation-diffs-viewer"
          />
        </UnchangedBlocksContext.Provider>
      </DiffTypesContext.Provider>
    </DiffMetaKeysContext.Provider>
  )
})
