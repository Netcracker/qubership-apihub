import { DEFAULT_DISPLAY_MODE, DEFAULT_EXPANDED_DEPTH } from '@apihub/constants/configuration'
import { CustomizationOptions, CustomizationOptionsContext } from '@apihub/contexts/CustomizationOptionsContext'
import { DiffMetaKeysContext } from '@apihub/contexts/DiffMetaKeysContext'
import { DisplayModeContext } from '@apihub/contexts/DisplayModeContext'
import { LayoutModeContext } from '@apihub/contexts/LayoutModeContext'
import { LevelContext } from '@apihub/contexts/LevelContext'
import { DiffMetaKeys } from '@apihub/types/DiffMetaKeys'
import { DisplayMode } from '@apihub/types/DisplayMode'
import { SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from '@apihub/types/LayoutMode'
import { DiffType } from '@netcracker/qubership-apihub-api-diff'
import {
  JsonSchemaTreeWithDiffsBuilder,
  createBuildingServiceLogger,
} from '@netcracker/qubership-apihub-next-data-model'
import {
  JsonSchemaTreeNode,
  JsonSchemaTreeNodeWithDiffs,
} from '@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases'
import { FC, memo, useCallback, useMemo, useReducer } from 'react'
import '../../index.css'
import { ErrorBoundary } from '../services/ErrorBoundary'
import { ErrorBoundaryFallback } from '../services/ErrorBoundaryFallback'
import '../shared-styles/diffs/index.css'
import {
  DefaultExtensionsJsoComponent,
  DefaultExtensionsJsoDiffsComponent,
} from './embedding/DefaultJsonSchemaEmbedding'
import { JsonSchemaEmbeddingContext, JsonSchemaEmbeddingContextValue } from './embedding/JsonSchemaEmbeddingContext'
import { JsonSchemaViewerContext } from './JsonSchemaViewerContext'
import { JsonSchemaNodeViewerWithDiffs } from './JsonSchemaNodeViewerWithDiffs'
import { resolveJsonSchemaDiffsNodesVisibilityMode } from './JsonSchemaDiffsNodesVisibilityMode'
import {
  UnchangedBlocksContext,
  useUnchangedBlocksContextValue,
} from './UnchangedBlocksContext'

export type JsonSchemaDiffsViewerProps = {
  schema: unknown
  expandedDepth?: number
  displayMode?: DisplayMode
  devMode?: boolean
  initialLevel?: number
  customizationOptions?: CustomizationOptions
  diffMetaKeys: DiffMetaKeys
  /**
   * Placeholder - accepted but not implemented yet: the viewer currently ignores it and renders
   * all diffs regardless of their type. Reserved for filtering diffs by type.
   */
  diffTypes?: ReadonlyArray<DiffType>
  /**
   * Toggles the "showing/hiding unchanged nodes" feature as a whole: `true` (default) collapses
   * runs of unchanged nodes behind a "Show unchanged" reveal control, `false` shows everything.
   * Modeled internally as `JsonSchemaDiffsNodesVisibilityMode` (see that file) because a third
   * mode - hide nodes whose only diffs fall outside `diffTypes` - is already planned; see
   * refactoring-notes.md (agent-packages/api-doc-viewer-authoring) for the design analysis.
   */
  hideUnchangedNodes?: boolean
}

export const JsonSchemaDiffsViewer: FC<JsonSchemaDiffsViewerProps> = memo((props) => {
  if (props.schema === null || props.schema === undefined) {
    return null
  }

  return (
    <ErrorBoundary fallback={(caught) => (
      <ErrorBoundaryFallback
        componentName="JSON Schema Diffs Viewer"
        caught={caught}
      />
    )}>
      <JsonSchemaDiffsViewerInner {...props} />
    </ErrorBoundary>
  )
})

const JsonSchemaDiffsViewerInner: FC<JsonSchemaDiffsViewerProps> = (props) => {
  const {
    schema,
    expandedDepth = DEFAULT_EXPANDED_DEPTH,
    displayMode = DEFAULT_DISPLAY_MODE,
    devMode = false,
    initialLevel = 0,
    customizationOptions,
    diffMetaKeys,
    // `diffTypes` is intentionally not read: filtering by diff type is a placeholder (see props).
    hideUnchangedNodes = true,
  } = props

  const visibilityMode = useMemo(
    () => resolveJsonSchemaDiffsNodesVisibilityMode(hideUnchangedNodes),
    [hideUnchangedNodes],
  )
  const unchangedBlocksContext = useUnchangedBlocksContextValue(visibilityMode)

  const logger = useMemo(() => createBuildingServiceLogger(devMode), [devMode])

  const builder = useMemo(
    () => new JsonSchemaTreeWithDiffsBuilder({
      source: schema,
      // See JsonSchemaViewer.tsx for why `expandedDepth` must be shifted by `initialLevel`
      // and incremented by 1 before being passed as `materializeDepth`: the builder's depth is
      // the crawled node's own 1-indexed depth, while `expandedDepth`/`initialLevel` are
      // 0-indexed UI levels, so passing `expandedDepth` unchanged defers a node's children one
      // level too early and forces it to render collapsed despite being "initially expanded".
      materializeDepth: expandedDepth - initialLevel + 1,
      diffsMetaKeys: diffMetaKeys,
      logger,
    }),
    [schema, expandedDepth, initialLevel, diffMetaKeys, logger],
  )

  const tree = useMemo(() => builder.build(), [builder])

  console.debug('[JSON Schema Diffs] Schema', schema)
  console.debug('[JSON Schema Diffs] Tree:', tree)

  const [treeRevision, bumpTreeRevision] = useReducer((revision: number) => revision + 1, 0)

  const materializeChildren = useCallback((node: JsonSchemaTreeNode | JsonSchemaTreeNodeWithDiffs) => {
    builder.materializeChildren(node)
    bumpTreeRevision()
  }, [builder])

  const viewerContext = useMemo(
    () => ({
      expandedDepth,
      materializeChildren,
      treeRevision,
    }),
    [expandedDepth, materializeChildren, treeRevision],
  )

  const embeddingContext: JsonSchemaEmbeddingContextValue = useMemo(
    () => ({
      ExtensionsJsoComponent: DefaultExtensionsJsoComponent,
      ExtensionsJsoDiffsComponent: DefaultExtensionsJsoDiffsComponent,
    }),
    [],
  )

  const root = tree.root
  if (!root) {
    return null
  }

  return (
    <JsonSchemaEmbeddingContext.Provider value={embeddingContext}>
      <DiffMetaKeysContext.Provider value={diffMetaKeys}>
        <UnchangedBlocksContext.Provider value={unchangedBlocksContext}>
          <JsonSchemaViewerContext.Provider value={viewerContext}>
            <CustomizationOptionsContext.Provider value={customizationOptions}>
              <DisplayModeContext.Provider value={displayMode}>
                <LayoutModeContext.Provider value={SIDE_BY_SIDE_DIFFS_LAYOUT_MODE}>
                  <LevelContext.Provider value={initialLevel}>
                    <div data-testid="json-schema-diffs-viewer">
                      <JsonSchemaNodeViewerWithDiffs node={root}/>
                    </div>
                  </LevelContext.Provider>
                </LayoutModeContext.Provider>
              </DisplayModeContext.Provider>
            </CustomizationOptionsContext.Provider>
          </JsonSchemaViewerContext.Provider>
        </UnchangedBlocksContext.Provider>
      </DiffMetaKeysContext.Provider>
    </JsonSchemaEmbeddingContext.Provider>
  )
}
