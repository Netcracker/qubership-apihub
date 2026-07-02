import { DEFAULT_DISPLAY_MODE } from "@apihub/constants/configuration";
import { DisplayModeContext } from "@apihub/contexts/DisplayModeContext";
import { LayoutModeContext } from "@apihub/contexts/LayoutModeContext";
import { LevelContext } from "@apihub/contexts/LevelContext";
import { DisplayMode } from "@apihub/types/DisplayMode";
import { SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "@apihub/types/LayoutMode";
import { AsyncApiTreeWithDiffsBuilder, createAsyncApiLogger } from "@netcracker/qubership-apihub-next-data-model";
import { FC, memo, useMemo } from "react";
import { ErrorBoundary } from "../services/ErrorBoundary";
import { ErrorBoundaryFallback } from "../services/ErrorBoundaryFallback";
import { AsyncApiDevModeContext } from "./AsyncApiDevModeContext";
import { MessageNodeViewer } from "./MessageNodeViewer";

import { DiffMetaKeysContext } from "@apihub/contexts/DiffMetaKeysContext";
import { DiffTypesContext } from "@apihub/contexts/DiffTypesContext";
import { OperationKeys } from "@apihub/next-data-model/shared/async-api/types/operation-keys";
import { isMessageNode } from "@apihub/utils/async-api/node-type-checkers";
import { DiffType } from "@netcracker/qubership-apihub-api-diff";
import '../../index.css';
import { DiffMetaKeys } from "../../types/DiffMetaKeys";
import '../shared-styles/diffs/index.css';

export type AsyncApiOperationDiffsViewerProps = {
  mergedSource: unknown
  operationKeys?: OperationKeys
  displayMode?: DisplayMode
  devMode?: boolean
  noHeading?: boolean
  referenceNamePropertyKey: symbol
  // diffs specific
  diffMetaKeys: DiffMetaKeys
  diffTypes?: ReadonlyArray<DiffType>
}

export const AsyncApiOperationDiffsViewer: FC<AsyncApiOperationDiffsViewerProps> =
  memo<AsyncApiOperationDiffsViewerProps>(props => {
    if (props.mergedSource === null) {
      return null
    }

    return (
      <ErrorBoundary fallback={<ErrorBoundaryFallback componentName="Async API Operation Viewer" />}>
        <AsyncApiOperationDiffsViewerInner {...props} />
      </ErrorBoundary>
    )
  })

const AsyncApiOperationDiffsViewerInner: FC<AsyncApiOperationDiffsViewerProps> =
  memo<AsyncApiOperationDiffsViewerProps>(props => {
    const {
      mergedSource: source,
      operationKeys,
      displayMode = DEFAULT_DISPLAY_MODE,
      devMode = false,
      noHeading = false,
      referenceNamePropertyKey,
      diffMetaKeys,
      diffTypes,
    } = props

    const logger = useMemo(() => createAsyncApiLogger(devMode), [devMode])

    const treeBuilder = useMemo(
      () => new AsyncApiTreeWithDiffsBuilder({
        source,
        referenceNamePropertyKey,
        diffsMetaKeys: diffMetaKeys,
        operationKeys,
        logger,
      }),
      [source, referenceNamePropertyKey, diffMetaKeys, operationKeys, logger]
    )
    const tree = useMemo(() => treeBuilder?.build() ?? null, [treeBuilder])

    logger.debug('[AsyncAPI Diffs] Original Source:', source)
    logger.debug('[AsyncAPI Diffs] Tree:', tree)

    const messageNode = tree?.root
    if (!messageNode || !isMessageNode(messageNode)) {
      return null
    }

    return (
      <DiffMetaKeysContext.Provider value={diffMetaKeys}>
        <DiffTypesContext.Provider value={diffTypes}>
          <AsyncApiDevModeContext.Provider value={devMode}>
            <DisplayModeContext.Provider value={displayMode}>
              <LayoutModeContext.Provider value={SIDE_BY_SIDE_DIFFS_LAYOUT_MODE}>
                <LevelContext.Provider value={0}>
                  <MessageNodeViewer
                    node={messageNode}
                    noHeading={noHeading}
                  />
                </LevelContext.Provider>
              </LayoutModeContext.Provider>
            </DisplayModeContext.Provider>
          </AsyncApiDevModeContext.Provider>
        </DiffTypesContext.Provider>
      </DiffMetaKeysContext.Provider>
    )
  })
