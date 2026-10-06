import { resolveJsonSchemaTypeLabel } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/type-label"
import {
  resolvePlainPropertyExpanderExpanded,
  resolvePlainPropertyInitiallyExpanded,
} from "@netcracker/qubership-apihub-next-data-model/building-service/json-schema/tree/node-visibility-data/kind-property"
import {
  resolveJsonSchemaPropertyNodeVisibility,
} from "@netcracker/qubership-apihub-next-data-model/building-service/json-schema/tree-with-diffs/node-visibility-data/kind-property"
import { resolveJsonSchemaPropertyInitiallyExpandedWithDiffs } from "@netcracker/qubership-apihub-next-data-model/building-service/json-schema/tree-with-diffs/node-visibility-data/kind-property-expand"
import { resolvePlainPropertyNodeVisibility } from "@netcracker/qubership-apihub-next-data-model/building-service/json-schema/tree/node-visibility-data/kind-property"
import { JsonSchemaTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/node-kind"
import { JsonSchemaRowDiffs } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/tree-with-diffs/property-row-diffs"
import { JsonSchemaCombinerSelectorRowResolver } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/tree-with-diffs/combiner-row-diffs"
import { NodeDiffsSeverityPlacemennt } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { LevelContext, useLevelContext } from "@apihub/contexts/LevelContext"
import { useAsyncLevelContext } from "@apihub/contexts/AsyncLevelContext/AsyncLevelContext"
import { AsyncLevelContextProvider } from "@apihub/contexts/AsyncLevelContext/AsyncLevelContextProvider"
import { useDisplayMode } from "@apihub/contexts/DisplayModeContext"
import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { NestingIndicatorTitleRow } from "@apihub/components/shared-components/NestingIndicatorTitleRow/NestingIndicatorTitleRow"
import { NestingIndicatorTitleRowUsage } from "@apihub/components/shared-components/NestingIndicatorTitleRow/types"
import { SelectorOption } from "@apihub/components/shared-components/Selector/Selector"
import {
  ATTRIBUTE_PRECEDED_BY,
  PrecededBy,
  WithPrecededByProps,
} from "../../shared-components/WithPrecededByProps"
import { useJsonSchemaViewerContext } from "../JsonSchemaViewerContext"
import { CombinerSelections, JsonSchemaCombiner } from "../utils/resolve-combiner"
import { JsonSchemaNestingLevel } from "../utils/resolve-nesting-level"
import { JsonSchemaNodeViewerWithDiffs } from "../JsonSchemaNodeViewerWithDiffs"
import { useOptionalUnchangedBlocksContext } from "../UnchangedBlocksContext"
import { SchemaNodeChildrenListWithDiffs } from "../SchemaNodeViewer/SchemaNodeChildrenListWithDiffs"
import { SchemaNodePlainContent } from "../SchemaNodeViewer/SchemaNodePlainContent"
import { SchemaNodeTitleRowWithDiffs } from "../SchemaNodeViewer/SchemaNodeTitleRowWithDiffs"
import { JsonSchemaCombinerOptionTypeValueWithDiffs } from "../SchemaNodeViewer/TypeValue/JsonSchemaCombinerOptionTypeValueWithDiffs"
import { CombinerSelectorRow } from "./CombinerSelectorRow"

function isJsonSchemaPropertyNodeWithDiffs(
  node: JsonSchemaTreeNodeWithDiffs,
): node is JsonSchemaTreeNodeWithDiffs<typeof JsonSchemaTreeNodeKinds.PROPERTY> {
  return node.kind === JsonSchemaTreeNodeKinds.PROPERTY
}

export type CombinerNodeViewerWithDiffsProps = WithPrecededByProps & {
  node: JsonSchemaTreeNodeWithDiffs
  isLastInList?: boolean
}

export const CombinerNodeViewerWithDiffs: FC<CombinerNodeViewerWithDiffsProps> = (props) => {
  const {
    node,
    isLastInList = false,
    [ATTRIBUTE_PRECEDED_BY]: precededBy,
  } = props

  const displayMode = useDisplayMode()
  const level = useLevelContext()
  const { expandedDepth, materializeChildren, treeRevision } = useJsonSchemaViewerContext()
  const unchangedBlocksContext = useOptionalUnchangedBlocksContext()
  const nestedNodes = node.nestedNodes()

  const [selections, setSelections] = useState<CombinerSelections>(() => new Map())

  const selectorLevels = useMemo(
    () => JsonSchemaCombiner.Selection.resolveSelectorLevels(node, selections),
    [node, selections],
  )

  const activeLeaf = useMemo(
    () => JsonSchemaCombiner.Selection.resolveActiveLeafNode(node, selections),
    [node, selections],
  )

  const activeLeafDisplayValue = useMemo(
    () => JsonSchemaCombiner.Display.resolveBranchValue(activeLeaf),
    [activeLeaf],
  )

  const activeLeafPropertyWithDiffs = isJsonSchemaPropertyNodeWithDiffs(activeLeaf)
    ? activeLeaf
    : undefined

  const contentVisibility = useMemo(
    () => activeLeafPropertyWithDiffs
      ? resolveJsonSchemaPropertyNodeVisibility(activeLeafPropertyWithDiffs, displayMode)
      : resolvePlainPropertyNodeVisibility(activeLeafDisplayValue, displayMode),
    [activeLeafDisplayValue, activeLeafPropertyWithDiffs, displayMode],
  )

  const leafChildren = useMemo(
    () => JsonSchemaCombiner.Display.resolveLeafStructuralChildren(activeLeaf),
    // treeRevision: lazy materialization mutates tree in place
    // eslint-disable-next-line react-hooks/exhaustive-deps -- treeRevision
    [activeLeaf, treeRevision],
  )

  const expandable = useMemo(
    () => leafChildren.length > 0,
    [leafChildren.length],
  )

  const initiallyExpanded = useMemo(
    () => {
      if (node.isCycle) {
        return false
      }
      if (leafChildren.length === 0) {
        return false
      }
      if (unchangedBlocksContext?.hideUnchangedNodes) {
        return resolveJsonSchemaPropertyInitiallyExpandedWithDiffs(activeLeaf, {
          expandedDepth,
          level,
          hideUnchangedNodes: true,
        })
      }
      return resolvePlainPropertyInitiallyExpanded(activeLeaf, { expandedDepth, level })
    },
    [
      node.isCycle,
      activeLeaf,
      unchangedBlocksContext?.hideUnchangedNodes,
      expandedDepth,
      leafChildren.length,
      level,
    ],
  )

  const effectiveInitiallyExpanded = useMemo(
    () => resolvePlainPropertyExpanderExpanded(activeLeaf, initiallyExpanded),
    // treeRevision: lazy materialization adds children without changing node identity
    // eslint-disable-next-line react-hooks/exhaustive-deps -- treeRevision
    [activeLeaf, initiallyExpanded, treeRevision],
  )

  const [expanded, setExpanded] = useState(effectiveInitiallyExpanded)

  // A branch switch (new `activeLeaf`) resets to that leaf's own initial expansion state; a
  // `treeRevision` bump (lazy materialization) on the SAME leaf only re-clamps the user's
  // existing choice against the leaf's now-current expandability, it must not reset it.
  const previousActiveLeafIdRef = useRef(activeLeaf.id)
  useEffect(() => {
    if (previousActiveLeafIdRef.current !== activeLeaf.id) {
      previousActiveLeafIdRef.current = activeLeaf.id
      setExpanded(resolvePlainPropertyExpanderExpanded(activeLeaf, initiallyExpanded))
      return
    }
    setExpanded((currentExpanded) => resolvePlainPropertyExpanderExpanded(activeLeaf, currentExpanded))
  }, [activeLeaf, initiallyExpanded, treeRevision])

  const onClickExpander = useCallback(() => {
    setExpanded((previousExpanded) => {
      const nextExpanded = !previousExpanded
      if (nextExpanded) {
        materializeChildren(activeLeaf)
      }
      return resolvePlainPropertyExpanderExpanded(activeLeaf, nextExpanded)
    })
  }, [activeLeaf, materializeChildren])

  const propertyNestingIndicatorTitle = useMemo(
    () => resolveJsonSchemaTypeLabel(activeLeafDisplayValue, activeLeaf.meta()),
    [activeLeaf, activeLeafDisplayValue],
  )

  /**
   * Title row's own combiner-kind suffix (e.g. " (anyOf)"), matching legacy's `NodeType.tsx`
   * `{type} ({combiner})` display - `node` here is always a combiner owner (guarded below by
   * `nestedNodes.length === 0` returning null), so this mirrors legacy's non-recursive
   * "check only the immediate owning node's own kind" rule; reused as-is from the combiner
   * option-button suffix logic since the check is identical.
   */
  const titleRowTypeValueSuffix = useMemo(
    () => JsonSchemaCombiner.NodeDiffs.resolveOptionTitleSuffix(node),
    [node],
  )

  const nestingIndicatorRowColorizingDiff = useMemo(
    () => JsonSchemaRowDiffs.NodeLevel.takeNestingIndicatorRowColorizingDiff(activeLeaf),
    [activeLeaf],
  )

  const asyncLevel = useAsyncLevelContext()
  const currentBeforeLevel = asyncLevel?.beforeLevel ?? level
  const currentAfterLevel = asyncLevel?.afterLevel ?? level

  const ownerNestingIndicatorRowColorizingDiff = useMemo(
    () => JsonSchemaRowDiffs.NodeLevel.takeNestingIndicatorRowColorizingDiff(node),
    [node],
  )
  /**
   * Independently of how many nested combiner levels `selectorLevels` collapses into one
   * shared selector-row level, the active leaf's structural children render at that SAME
   * level - the selector row already represents the one nesting step from the owner into the
   * combiner's content; there is no separate step from "selector" to "leaf". Do not resolve a
   * further level pair here from `nestingIndicatorRowColorizingDiff` - that would double the
   * increment or reduction (see CombinerNodeViewer session lesson).
   */
  const { beforeLevel: selectorBeforeLevel, afterLevel: selectorAfterLevel } = useMemo(
    () => JsonSchemaNestingLevel.resolveNextLevelPair(currentBeforeLevel, currentAfterLevel, ownerNestingIndicatorRowColorizingDiff),
    [currentBeforeLevel, currentAfterLevel, ownerNestingIndicatorRowColorizingDiff],
  )

  const onSelectOption = useCallback((
    combinerNode: JsonSchemaTreeNodeWithDiffs,
    option: SelectorOption<JsonSchemaTreeNodeWithDiffs>,
  ) => {
    setSelections((previousSelections) => JsonSchemaCombiner.Selection.applySelection(
      node,
      previousSelections,
      combinerNode.id,
      option.node.id,
    ))
  }, [node])

  if (nestedNodes.length === 0) {
    return null
  }

  const showLeafChildren = expanded && leafChildren.length > 0
  const useHideUnchangedLeafChildren = Boolean(unchangedBlocksContext)

  return (
    <div
      data-testid="json-schema-combiner-node-viewer"
      className="json-schema-property flex flex-col"
    >
      <SchemaNodeTitleRowWithDiffs
        data-precededby={precededBy}
        ownerNode={node}
        displayNode={activeLeaf}
        displayValue={activeLeafDisplayValue}
        contentVisibility={contentVisibility}
        isLastInList={isLastInList && !contentVisibility.showContentSection && !expandable}
        expandable={expandable}
        expanded={expanded}
        onClickExpander={onClickExpander}
        typeValueSuffix={titleRowTypeValueSuffix}
      />

      <SchemaNodePlainContent
        node={activeLeaf}
        displayValue={activeLeafDisplayValue}
        isLastInList={isLastInList && !expandable && selectorLevels.every((selectorLevel) => !selectorLevel.showSelector)}
      />

      <LevelContext.Provider value={level + 1}>
        <AsyncLevelContextProvider beforeLevel={selectorBeforeLevel} afterLevel={selectorAfterLevel}>
          {selectorLevels.map((selectorLevel) => {
            const options = selectorLevel.nestedNodes.map((nestedNode, index) => (
              JsonSchemaCombiner.NodeDiffs.buildSelectorOption(
                nestedNode,
                index,
                (layoutSide: LayoutSide) => (
                  <JsonSchemaCombinerOptionTypeValueWithDiffs node={nestedNode} layoutSide={layoutSide} />
                ),
              )
            ))

            const selectedOption = options.find(
              (option) => option.node.id === selectorLevel.selectedNestedNode.id,
            ) ?? options[0] ?? null

            const selectorRowPresentation = JsonSchemaCombinerSelectorRowResolver
              .resolveCombinerSelectorRowPresentation(selectorLevel.combinerNode)
            const levelReductionAction = JsonSchemaCombinerSelectorRowResolver
              .resolveCombinerSelectorLevelReductionAction(selectorLevel.combinerNode)

            return (
              <CombinerSelectorRow
                key={selectorLevel.combinerNode.id}
                combinerKindLabel={selectorLevel.combinerKindLabel}
                showSelector={selectorLevel.showSelector}
                options={options}
                selectedOption={selectedOption}
                onSelectOption={(option) => onSelectOption(selectorLevel.combinerNode, option)}
                selectorRowDiff={selectorRowPresentation.selectorRowDiff}
                diffsSeverities={selectorRowPresentation.diffsSeverities}
                levelReductionAction={levelReductionAction}
              />
            )
          })}

          {showLeafChildren && (
            <>
              <NestingIndicatorTitleRow
                title={propertyNestingIndicatorTitle}
                usage={NestingIndicatorTitleRowUsage.JsonSchema}
                lastInvisible
                diff={nestingIndicatorRowColorizingDiff}
                diffsSeverities={activeLeaf.diffsSeverities}
                diffsSeverityPlacement={NodeDiffsSeverityPlacemennt.NestingIndicatorRow}
              />
              {useHideUnchangedLeafChildren ? (
                <SchemaNodeChildrenListWithDiffs
                  children={leafChildren}
                />
              ) : (
                leafChildren.map((child, index) => (
                  <JsonSchemaNodeViewerWithDiffs
                    key={child.id}
                    data-precededby={PrecededBy.JSON_SCHEMA_PROPERTY}
                    node={child}
                    isLastInList={index === leafChildren.length - 1}
                  />
                ))
              )}
            </>
          )}
        </AsyncLevelContextProvider>
      </LevelContext.Provider>
    </div>
  )
}
