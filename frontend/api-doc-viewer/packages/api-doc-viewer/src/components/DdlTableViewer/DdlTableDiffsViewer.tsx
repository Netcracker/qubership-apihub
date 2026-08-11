import { DEFAULT_DISPLAY_MODE } from "@apihub/constants/configuration"
import { DiffMetaKeysContext } from "@apihub/contexts/DiffMetaKeysContext"
import { DiffTypesContext } from "@apihub/contexts/DiffTypesContext"
import { DisplayModeContext } from "@apihub/contexts/DisplayModeContext"
import { LayoutModeContext } from "@apihub/contexts/LayoutModeContext"
import { LevelContext } from "@apihub/contexts/LevelContext"
import { DiffMetaKeys } from "@apihub/types/DiffMetaKeys"
import { DisplayMode } from "@apihub/types/DisplayMode"
import { SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "@apihub/types/LayoutMode"
import { isTableNodeWithDiffs } from "@apihub/utils/ddlapi/node-type-checkers"
import { DiffType } from "@netcracker/qubership-apihub-api-diff"
import { DdlApiTreeWithDiffsBuilder, createBuildingServiceLogger } from "@netcracker/qubership-apihub-next-data-model"
import { NavigationLinkBuilder } from "@netcracker/qubership-apihub-next-data-model/shared/ddlapi/types/navigation-link-builder"
import { TableKey } from "@netcracker/qubership-apihub-next-data-model/shared/ddlapi/types/table-key"
import { FC, memo, useMemo } from "react"
import '../../index.css'
import { ErrorBoundary } from "../services/ErrorBoundary"
import { ErrorBoundaryFallback } from "../services/ErrorBoundaryFallback"
import '../shared-styles/diffs/index.css'
import { DdlTableViewerContext } from "./DdlTableViewerContext"
import { DefaultNavigationLink, type NavigationLinkComponent } from "./DefaultNavigationLink"
import './styles/index.css'
import { TableNodeViewerWithDiffs } from "./TableNodeViewerWithDiffs"

export type DdlTableDiffsViewerProps = {
  mergedSource: unknown
  tableKey: TableKey
  navigationLinkBuilder: NavigationLinkBuilder
  navigationLinkComponent?: NavigationLinkComponent
  displayMode?: DisplayMode
  devMode?: boolean
  noHeading?: boolean
  diffMetaKeys: DiffMetaKeys
  diffTypes?: ReadonlyArray<DiffType>
}

export const DdlTableDiffsViewer: FC<DdlTableDiffsViewerProps> =
  memo<DdlTableDiffsViewerProps>(props => {
    if (props.mergedSource === null) {
      return null
    }

    return (
      <ErrorBoundary fallback={<ErrorBoundaryFallback componentName="DDL Table Diffs Viewer" />}>
        <DdlTableDiffsViewerInner {...props} />
      </ErrorBoundary>
    )
  })

const DdlTableDiffsViewerInner: FC<DdlTableDiffsViewerProps> =
  memo<DdlTableDiffsViewerProps>(props => {
    const {
      mergedSource: source,
      tableKey,
      navigationLinkBuilder,
      navigationLinkComponent = DefaultNavigationLink,
      displayMode = DEFAULT_DISPLAY_MODE,
      devMode = false,
      noHeading = false,
      diffMetaKeys,
      diffTypes,
    } = props

    const logger = useMemo(() => createBuildingServiceLogger(devMode), [devMode])

    const treeBuilder = useMemo(
      () => new DdlApiTreeWithDiffsBuilder({
        source,
        tableKey,
        diffsMetaKeys: diffMetaKeys,
        logger,
      }),
      [source, tableKey, diffMetaKeys, logger],
    )
    const tree = useMemo(() => treeBuilder.build(), [treeBuilder])

    const viewerContext = useMemo(
      () => ({ navigationLinkBuilder, navigationLinkComponent }),
      [navigationLinkBuilder, navigationLinkComponent],
    )

    logger.debug('[DDL API Diffs] Original Source:', source)
    logger.debug('[DDL API Diffs] Table Key:', tableKey)
    logger.debug('[DDL API Diffs] Navigation Link Builder:', navigationLinkBuilder)
    logger.debug('[DDL API Diffs] Tree:', tree)

    const tableNode = tree.root
    if (!tableNode || !isTableNodeWithDiffs(tableNode)) {
      return null
    }

    return (
      <DiffMetaKeysContext.Provider value={diffMetaKeys}>
        <DiffTypesContext.Provider value={diffTypes}>
          <DdlTableViewerContext.Provider value={viewerContext}>
            <DisplayModeContext.Provider value={displayMode}>
              <LayoutModeContext.Provider value={SIDE_BY_SIDE_DIFFS_LAYOUT_MODE}>
                <LevelContext.Provider value={0}>
                  <div data-testid="ddl-table-diffs-viewer">
                    <TableNodeViewerWithDiffs
                      node={tableNode}
                      noHeading={noHeading}
                    />
                  </div>
                </LevelContext.Provider>
              </LayoutModeContext.Provider>
            </DisplayModeContext.Provider>
          </DdlTableViewerContext.Provider>
        </DiffTypesContext.Provider>
      </DiffMetaKeysContext.Provider>
    )
  })
