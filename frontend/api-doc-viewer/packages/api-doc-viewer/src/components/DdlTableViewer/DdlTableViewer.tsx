import { DEFAULT_DISPLAY_MODE } from "@apihub/constants/configuration"
import { DisplayModeContext } from "@apihub/contexts/DisplayModeContext"
import { LayoutModeContext } from "@apihub/contexts/LayoutModeContext"
import { LevelContext } from "@apihub/contexts/LevelContext"
import { isTableNode } from "@apihub/utils/ddlapi/node-type-checkers"
import { DisplayMode } from "@apihub/types/DisplayMode"
import { DOCUMENT_LAYOUT_MODE } from "@apihub/types/LayoutMode"
import { DdlApiTreeBuilder, createBuildingServiceLogger } from "@netcracker/qubership-apihub-next-data-model"
import { NavigationLinkBuilder } from "@netcracker/qubership-apihub-next-data-model/shared/ddlapi/types/navigation-link-builder"
import { TableKey } from "@netcracker/qubership-apihub-next-data-model/shared/ddlapi/types/table-key"
import { FC, memo, useMemo } from "react"
import { ErrorBoundary } from "../services/ErrorBoundary"
import { ErrorBoundaryFallback } from "../services/ErrorBoundaryFallback"
import { DdlTableViewerContext } from "./DdlTableViewerContext"
import { DefaultNavigationLink, type NavigationLinkComponent } from "./DefaultNavigationLink"
import { TableNodeViewer } from "./TableNodeViewer"
import '../../index.css'
import './styles/index.css'

export type DdlTableViewerProps = {
  source: unknown
  tableKey: TableKey
  navigationLinkBuilder: NavigationLinkBuilder
  navigationLinkComponent?: NavigationLinkComponent
  displayMode?: DisplayMode
  devMode?: boolean
  noHeading?: boolean
}

export const DdlTableViewer: FC<DdlTableViewerProps> =
  memo<DdlTableViewerProps>(props => {
    if (props.source === null) {
      return null
    }

    return (
      <ErrorBoundary fallback={<ErrorBoundaryFallback componentName="DDL Table Viewer" />}>
        <DdlTableViewerInner {...props} />
      </ErrorBoundary>
    )
  })

const DdlTableViewerInner: FC<DdlTableViewerProps> =
  memo<DdlTableViewerProps>((props) => {
    const {
      source,
      tableKey,
      navigationLinkBuilder,
      navigationLinkComponent = DefaultNavigationLink,
      displayMode = DEFAULT_DISPLAY_MODE,
      devMode = false,
      noHeading = false,
    } = props

    const logger = useMemo(() => createBuildingServiceLogger(devMode), [devMode])

    const treeBuilder = useMemo(
      () => new DdlApiTreeBuilder({
        source,
        tableKey,
        logger,
      }),
      [source, tableKey, logger],
    )
    const tree = useMemo(() => treeBuilder.build(), [treeBuilder])

    const viewerContext = useMemo(
      () => ({ navigationLinkBuilder, navigationLinkComponent }),
      [navigationLinkBuilder, navigationLinkComponent],
    )

    logger.debug('[DDL API] Original Source:', source)
    logger.debug('[DDL API] Table Key:', tableKey)
    logger.debug('[DDL API] Navigation Link Builder:', navigationLinkBuilder)
    logger.debug('[DDL API] Tree:', tree)

    const tableNode = tree.root
    if (!tableNode || !isTableNode(tableNode)) {
      return null
    }

    return (
      <DdlTableViewerContext.Provider value={viewerContext}>
        <DisplayModeContext.Provider value={displayMode}>
          <LayoutModeContext.Provider value={DOCUMENT_LAYOUT_MODE}>
            <LevelContext.Provider value={0}>
              <div data-testid="ddl-table-viewer">
                <TableNodeViewer node={tableNode} noHeading={noHeading} />
              </div>
            </LevelContext.Provider>
          </LayoutModeContext.Provider>
        </DisplayModeContext.Provider>
      </DdlTableViewerContext.Provider>
    )
  })
