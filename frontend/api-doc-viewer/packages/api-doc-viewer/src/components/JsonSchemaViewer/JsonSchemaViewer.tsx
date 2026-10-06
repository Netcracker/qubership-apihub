import { DEFAULT_DISPLAY_MODE, DEFAULT_EXPANDED_DEPTH } from '@apihub/constants/configuration'
import { CustomizationOptions, CustomizationOptionsContext } from '@apihub/contexts/CustomizationOptionsContext'
import { DisplayModeContext } from '@apihub/contexts/DisplayModeContext'
import { LayoutModeContext } from '@apihub/contexts/LayoutModeContext'
import { LevelContext } from '@apihub/contexts/LevelContext'
import { DisplayMode } from '@apihub/types/DisplayMode'
import { DOCUMENT_LAYOUT_MODE } from '@apihub/types/LayoutMode'
import { JsonSchemaTreeBuilder, createBuildingServiceLogger } from '@netcracker/qubership-apihub-next-data-model'
import { JsonSchemaTreeNode } from '@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases'
import { FC, memo, useCallback, useMemo, useReducer } from 'react'
import '../../index.css'
import { ErrorBoundary } from '../services/ErrorBoundary'
import { ErrorBoundaryFallback } from '../services/ErrorBoundaryFallback'
import {
  DefaultExtensionsJsoComponent,
  DefaultExtensionsJsoDiffsComponent,
} from './embedding/DefaultJsonSchemaEmbedding'
import { JsonSchemaEmbeddingContext, JsonSchemaEmbeddingContextValue } from './embedding/JsonSchemaEmbeddingContext'
import { JsonSchemaNodeViewer } from './JsonSchemaNodeViewer'
import { JsonSchemaViewerContext } from './JsonSchemaViewerContext'
import { TopLevelPropsMediaTypesMap } from './utils/top-level-props-media-types'

export type JsonSchemaViewerProps = {
  schema: unknown
  expandedDepth?: number
  displayMode?: DisplayMode
  devMode?: boolean
  initialLevel?: number
  customizationOptions?: CustomizationOptions
  /**
   * Root's direct property key -> media type, shown as a badge next to the property name (e.g.
   * OpenAPI parameters described with `content`). Not supported by `JsonSchemaDiffsViewer`.
   */
  topLevelPropsMediaTypes?: TopLevelPropsMediaTypesMap
}

export const JsonSchemaViewer: FC<JsonSchemaViewerProps> = memo((props) => {
  if (props.schema === null || props.schema === undefined) {
    return null
  }

  return (
    <ErrorBoundary fallback={(caught) => (
      <ErrorBoundaryFallback
        componentName="JSON Schema Viewer"
        caught={caught}
      />
    )}>
      <JsonSchemaViewerInner {...props} />
    </ErrorBoundary>
  )
})

const JsonSchemaViewerInner: FC<JsonSchemaViewerProps> = (props) => {
  const {
    schema,
    expandedDepth = DEFAULT_EXPANDED_DEPTH,
    displayMode = DEFAULT_DISPLAY_MODE,
    devMode = false,
    initialLevel = 0,
    customizationOptions,
    topLevelPropsMediaTypes,
  } = props

  const logger = useMemo(() => createBuildingServiceLogger(devMode), [devMode])

  const builder = useMemo(
    () => new JsonSchemaTreeBuilder({
      source: schema,
      // `materializeDepth` counts the crawled node's OWN 1-indexed depth (root = 1), while
      // `expandedDepth`/`initialLevel` are 0-indexed UI levels (root level = `initialLevel`). A
      // node at UI level L is expanded when L < expandedDepth, and its children (UI level L + 1)
      // must exist for that expansion to render - i.e. materialized while crawl depth
      // (L - initialLevel + 1) < expandedDepth - initialLevel + 1. Passing `expandedDepth` as-is
      // here under-materializes by one level, forcing every initially-expanded node collapsed
      // because its children array comes back empty.
      materializeDepth: expandedDepth - initialLevel + 1,
      logger,
    }),
    [schema, expandedDepth, initialLevel, logger],
  )

  const tree = useMemo(() => builder.build(), [builder])

  const [treeRevision, bumpTreeRevision] = useReducer((revision: number) => revision + 1, 0)

  const materializeChildren = useCallback((node: JsonSchemaTreeNode) => {
    builder.materializeChildren(node)
    bumpTreeRevision()
  }, [builder])

  const viewerContext = useMemo(
    () => ({
      expandedDepth,
      materializeChildren,
      treeRevision,
      topLevelPropsMediaTypes,
    }),
    [expandedDepth, materializeChildren, treeRevision, topLevelPropsMediaTypes],
  )

  const embeddingContext: JsonSchemaEmbeddingContextValue = useMemo(
    () => ({
      ExtensionsJsoComponent: DefaultExtensionsJsoComponent,
      ExtensionsJsoDiffsComponent: DefaultExtensionsJsoDiffsComponent,
    }),
    [],
  )

  console.debug('[JSON Schema] Schema:', schema)
  console.debug('[JSON Schema] Tree:', tree)

  const root = tree.root
  if (!root) {
    return null
  }

  return (
    <JsonSchemaEmbeddingContext.Provider value={embeddingContext}>
      <JsonSchemaViewerContext.Provider value={viewerContext}>
        <CustomizationOptionsContext.Provider value={customizationOptions}>
          <DisplayModeContext.Provider value={displayMode}>
            <LayoutModeContext.Provider value={DOCUMENT_LAYOUT_MODE}>
              <LevelContext.Provider value={initialLevel}>
                <div data-testid="json-schema-viewer">
                  <JsonSchemaNodeViewer node={root}/>
                </div>
              </LevelContext.Provider>
            </LayoutModeContext.Provider>
          </DisplayModeContext.Provider>
        </CustomizationOptionsContext.Provider>
      </JsonSchemaViewerContext.Provider>
    </JsonSchemaEmbeddingContext.Provider>
  )
}
