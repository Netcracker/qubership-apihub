import { DisplayMode } from "@apihub/types/DisplayMode"
import { DiffMetaKeys } from "@apihub/types/DiffMetaKeys"
import { DdlApiTreeWithDiffsBuilder, createBuildingServiceLogger } from "@netcracker/qubership-apihub-next-data-model"
import { DiffType } from "@netcracker/qubership-apihub-api-diff"
import { NavigationLinkBuilder } from "@netcracker/qubership-apihub-next-data-model/shared/ddlapi/types/navigation-link-builder"
import { TableKey } from "@netcracker/qubership-apihub-next-data-model/shared/ddlapi/types/table-key"
import { FC, memo, useMemo } from "react"
import { ErrorBoundary } from "../services/ErrorBoundary"
import { ErrorBoundaryFallback } from "../services/ErrorBoundaryFallback"

export type DdlTableDiffsViewerProps = {
  mergedSource: unknown
  tableKey: TableKey
  navigationLinkBuilder: NavigationLinkBuilder
  // techincal props
  displayMode?: DisplayMode
  devMode?: boolean
  noHeading?: boolean
  // diffs specific props
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
      devMode = false,
      diffMetaKeys,
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

    logger.debug('[DDL API Diffs] Original Source:', source)
    logger.debug('[DDL API Diffs] Table Key:', tableKey)
    logger.debug('[DDL API Diffs] Navigation Link Builder:', navigationLinkBuilder)
    logger.debug('[DDL API Diffs] Tree:', tree)

    return (
      <div>
        <h1>DDL Table Diffs Viewer</h1>
        <p>Component is under construction.</p>
      </div>
    )
  })
