import { DEFAULT_DISPLAY_MODE } from "@apihub/constants/configuration"
import { AsyncLevelContextProvider } from "@apihub/contexts/AsyncLevelContext/AsyncLevelContextProvider"
import { DiffMetaKeysContext } from "@apihub/contexts/DiffMetaKeysContext"
import { DiffTypesContext } from "@apihub/contexts/DiffTypesContext"
import { DisplayModeContext } from "@apihub/contexts/DisplayModeContext"
import { LayoutModeContext } from "@apihub/contexts/LayoutModeContext"
import { SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "@apihub/types/LayoutMode"
import { isSameDiffActionForAll } from "@apihub/utils/jso/infer-node-change-from-children-changes"
import { DiffMetaKeys } from "@netcracker/qubership-apihub-api-data-model"
import { DiffType } from "@netcracker/qubership-apihub-api-diff"
import { JsoTreeWithDiffsBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/jso/tree-with-diffs/builder"
import { createBuildingServiceLogger } from "@netcracker/qubership-apihub-next-data-model/loggers"
import { NODE_LEVEL_DIFF_KEY } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { FC, memo, useMemo } from "react"
import { DisplayMode } from "../.."
import { ErrorBoundary } from "../services/ErrorBoundary"
import { ErrorBoundaryFallback } from "../services/ErrorBoundaryFallback"
import { ATTRIBUTE_PRECEDED_BY, PrecededBy, WithPrecededByProps } from "../shared-components/WithPrecededByProps"
import '../shared-styles/diffs/index.css'
import { JsoPropertyNodeViewerWithDiffs } from "./JsoPropertyNodeViewerWithDiffs"

type JsoDiffsViewerProps = WithPrecededByProps & {
  mergedSource: unknown
  displayMode?: DisplayMode
  initialLevel?: number
  supportJsonSchema?: boolean
  devMode?: boolean
  // diffs specific
  diffMetaKeys: DiffMetaKeys
  diffTypes?: ReadonlyArray<DiffType>
}

export const JsoDiffsViewer: FC<JsoDiffsViewerProps> =
  memo<JsoDiffsViewerProps>(props => {
    if (props.mergedSource === null) {
      return null
    }

    return (
      <ErrorBoundary fallback={<ErrorBoundaryFallback componentName="JSO Diffs Viewer" />}>
        <JsoDiffsViewerInner {...props} />
      </ErrorBoundary>
    )
  })

const JsoDiffsViewerInner: FC<JsoDiffsViewerProps> =
  memo<JsoDiffsViewerProps>(props => {
    const {
      mergedSource: source,
      displayMode = DEFAULT_DISPLAY_MODE,
      initialLevel = 0,
      supportJsonSchema = false,
      devMode = false,
      diffMetaKeys,
      diffTypes,
    } = props

    // indent-specific
    const { [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

    const logger = useMemo(() => createBuildingServiceLogger(devMode), [devMode])

    const builder = useMemo(
      () => new JsoTreeWithDiffsBuilder({
        source,
        supportJsonSchema,
        diffsMetaKeys: diffMetaKeys,
        logger,
      }),
      [source, supportJsonSchema, diffMetaKeys, logger],
    )
    const tree = useMemo(() => builder.build(), [builder])

    logger.debug("[JSO Diffs] Source:", source)
    logger.debug("[JSO Diffs] Tree:", tree)

    const root = tree.root
    if (!root) {
      return null
    }

    const jsoProperties = root.childrenNodes()
    if (jsoProperties.length === 0) {
      return null
    }

    const allChildrenAreDiffs = isSameDiffActionForAll(jsoProperties)

    const [nextBeforeLevel, nextAfterLevel] = (() => {
      let _nextBeforeLevel = initialLevel
      let _nextAfterLevel = initialLevel

      const [firstJsoProperty] = jsoProperties
      const firstChildNodeValueDiff = firstJsoProperty.diffs[NODE_LEVEL_DIFF_KEY]
      if (firstChildNodeValueDiff && allChildrenAreDiffs) {
        _nextBeforeLevel = firstChildNodeValueDiff.flags.before.increaseLevel ? initialLevel : initialLevel - 1
        _nextAfterLevel = firstChildNodeValueDiff.flags.after.increaseLevel ? initialLevel : initialLevel - 1
      }

      return [_nextBeforeLevel, _nextAfterLevel]
    })()

    return (
      <DiffMetaKeysContext.Provider value={diffMetaKeys}>
        <DiffTypesContext.Provider value={diffTypes}>
          <DisplayModeContext.Provider value={displayMode}>
            <LayoutModeContext.Provider value={SIDE_BY_SIDE_DIFFS_LAYOUT_MODE}>
              <AsyncLevelContextProvider beforeLevel={nextBeforeLevel} afterLevel={nextAfterLevel}>
                <div data-testid='jso-diffs-viewer'>
                  {jsoProperties.map((jsoProperty, index) => (
                    <JsoPropertyNodeViewerWithDiffs
                      data-precededby={
                        index === 0
                          ? precededBy
                          : PrecededBy.JSO_PROPERTY
                      }
                      key={jsoProperty.id}
                      node={jsoProperty}
                      supportJsonSchema={supportJsonSchema}
                    />
                  ))}
                </div>
              </AsyncLevelContextProvider>
            </LayoutModeContext.Provider>
          </DisplayModeContext.Provider>
        </DiffTypesContext.Provider>
      </DiffMetaKeysContext.Provider>
    )
  })
