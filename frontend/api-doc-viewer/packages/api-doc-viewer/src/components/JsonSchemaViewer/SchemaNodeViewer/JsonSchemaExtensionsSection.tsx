import { NestingIndicatorTitleRow } from "@apihub/components/shared-components/NestingIndicatorTitleRow/NestingIndicatorTitleRow"
import { NestingIndicatorTitleRowUsage } from "@apihub/components/shared-components/NestingIndicatorTitleRow/types"
import { useAsyncLevelContext } from "@apihub/contexts/AsyncLevelContext/AsyncLevelContext"
import { AsyncLevelContextProvider } from "@apihub/contexts/AsyncLevelContext/AsyncLevelContextProvider"
import { useDiffMetaKeys } from "@apihub/contexts/DiffMetaKeysContext"
import { useDisplayMode } from "@apihub/contexts/DisplayModeContext"
import { LevelContext, useLevelContext } from "@apihub/contexts/LevelContext"
import { Diff, DiffType } from "@netcracker/qubership-apihub-api-diff"
import {
  ChangedPropertyMetaData,
  NodeDiffsSeverities,
  NodeDiffsSeverityPlacemennt,
} from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { OpenApiExtensionKey } from "@netcracker/qubership-apihub-next-data-model/shared/json-schema/types/extension-key"
import { FC, useMemo } from "react"
import { useJsonSchemaEmbeddingContext } from "../embedding/JsonSchemaEmbeddingContext"
import { JsonSchemaNestingLevel } from "../utils/resolve-nesting-level"

export type JsonSchemaExtensionsSectionProps = {
  extensions: Record<OpenApiExtensionKey, unknown>
  extensionsDiffs?: Partial<Record<OpenApiExtensionKey, Diff<DiffType>>>
  /** Background/badge for the `Extensions` row itself - set only when the owning node (the
   * property/root this `x-*` sub-tree is attached to) was wholly added/removed. See
   * `JsonSchemaKindAnyNodeDiffs.extensionsRowColorizingDiff` for scope. */
  extensionsRowColorizingDiff?: ChangedPropertyMetaData
  diffsSeverities?: NodeDiffsSeverities
}

export const JsonSchemaExtensionsSection: FC<JsonSchemaExtensionsSectionProps> = (props) => {
  const { extensions, extensionsDiffs, extensionsRowColorizingDiff, diffsSeverities } = props
  const level = useLevelContext()
  const nestedLevel = level + 1
  const displayMode = useDisplayMode()
  const diffMetaKeys = useDiffMetaKeys()
  const { ExtensionsJsoComponent, ExtensionsJsoDiffsComponent } = useJsonSchemaEmbeddingContext()

  // Mirrors SchemaNodeViewer's own children nesting-indicator row: when the owning node was
  // wholly added/removed, one side has no content at all, so the Extensions row's nesting level
  // must track that asymmetry per side instead of always incrementing the ambient (parent)
  // level symmetrically - otherwise the row renders at the same level regardless of add/remove.
  const asyncLevel = useAsyncLevelContext()
  const currentBeforeLevel = asyncLevel?.beforeLevel ?? level
  const currentAfterLevel = asyncLevel?.afterLevel ?? level
  const { beforeLevel: nextBeforeLevel, afterLevel: nextAfterLevel } = useMemo(
    () => JsonSchemaNestingLevel.resolveNextLevelPair(currentBeforeLevel, currentAfterLevel, extensionsRowColorizingDiff),
    [currentBeforeLevel, currentAfterLevel, extensionsRowColorizingDiff],
  )

  const hasExtensionsDiffs = !!extensionsDiffs && Object.keys(extensionsDiffs).length > 0

  // Only whole-key add/remove and a value's type crossing (object<->array<->primitive<->JSON
  // Schema) need a synthetic top-level diff injected here - those are the cases where the raw
  // crawl diffs record carries a diff for the extension KEY itself (see
  // `JsonSchemaNodeDiffsAggregatorKindAny.aggregateExtensionsDiffs`). A same-JS-type replace
  // (object -> object, array -> array with different content) is NOT a key-level diff at all:
  // api-diff recurses and embeds `[diffsMetaKey]` *inside* the merged value instead, which
  // `JsoDiffsViewer`'s own crawl already discovers on its own. So the viewer choice must be
  // "are we in a diffs tree at all" (`diffMetaKeys` presence), never "did this aggregator find a
  // top-level diff" - gating on the latter left same-type replaces rendering as a single-column
  // plain `JsoViewer` with an empty changed side.
  const mergedSource = useMemo(() => {
    if (!hasExtensionsDiffs || !diffMetaKeys) {
      return extensions
    }
    return { ...extensions, [diffMetaKeys.diffsMetaKey]: extensionsDiffs }
  }, [diffMetaKeys, extensions, extensionsDiffs, hasExtensionsDiffs])

  return (
    <LevelContext.Provider value={nestedLevel}>
      <AsyncLevelContextProvider beforeLevel={nextBeforeLevel} afterLevel={nextAfterLevel}>
        <div className="flex flex-col">
          <NestingIndicatorTitleRow
            title="Extensions"
            usage={NestingIndicatorTitleRowUsage.JsonSchema}
            lastInvisible
            diff={extensionsRowColorizingDiff}
            diffsSeverities={diffsSeverities}
            diffsSeverityPlacement={NodeDiffsSeverityPlacemennt.ExtensionsRow}
          />
          {diffMetaKeys ? (
            <ExtensionsJsoDiffsComponent
              mergedSource={mergedSource}
              initialLevel={nestedLevel}
              displayMode={displayMode}
              diffMetaKeys={diffMetaKeys}
            />
          ) : (
            <ExtensionsJsoComponent
              source={extensions}
              initialLevel={nestedLevel}
            />
          )}
        </div>
      </AsyncLevelContextProvider>
    </LevelContext.Provider>
  )
}
