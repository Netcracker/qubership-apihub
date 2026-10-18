import { resolveJsonSchemaTypeLabel } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/type-label"
import {
  resolvePlainPropertyExpanderExpanded,
  resolvePlainPropertyInitiallyExpanded,
  resolvePlainPropertyNodeVisibility,
} from "@netcracker/qubership-apihub-next-data-model/building-service/json-schema/tree/node-visibility-data/kind-property"
import { JsonSchemaTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import { LevelContext, useLevelContext } from "@apihub/contexts/LevelContext"
import { useAsyncLevelContext } from "@apihub/contexts/AsyncLevelContext/AsyncLevelContext"
import { AsyncLevelContextProvider } from "@apihub/contexts/AsyncLevelContext/AsyncLevelContextProvider"
import { useDisplayMode } from "@apihub/contexts/DisplayModeContext"
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
import { JsonSchemaNodeViewer } from "../JsonSchemaNodeViewer"
import { SchemaNodePlainContent } from "../SchemaNodeViewer/SchemaNodePlainContent"
import { SchemaNodeTitleRow } from "../SchemaNodeViewer/SchemaNodeTitleRow"
import { JsonSchemaCombinerOptionTypeValue } from "../SchemaNodeViewer/TypeValue/JsonSchemaCombinerOptionTypeValue"
import { CombinerSelectorRow } from "./CombinerSelectorRow"

export type CombinerNodeViewerProps = WithPrecededByProps & {
  node: JsonSchemaTreeNode
  isLastInList?: boolean
}

export const CombinerNodeViewer: FC<CombinerNodeViewerProps> = (props) => {
  const {
    node,
    isLastInList = false,
    [ATTRIBUTE_PRECEDED_BY]: precededBy,
  } = props

  const displayMode = useDisplayMode()
  const level = useLevelContext()
  const { expandedDepth, materializeChildren, treeRevision } = useJsonSchemaViewerContext()
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

  const contentVisibility = useMemo(
    () => resolvePlainPropertyNodeVisibility(activeLeafDisplayValue, displayMode),
    [activeLeafDisplayValue, displayMode],
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
      return resolvePlainPropertyInitiallyExpanded(activeLeaf, { expandedDepth, level })
    },
    [node.isCycle, activeLeaf, expandedDepth, leafChildren.length, level],
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

  const asyncLevel = useAsyncLevelContext()
  const currentBeforeLevel = asyncLevel?.beforeLevel ?? level
  const currentAfterLevel = asyncLevel?.afterLevel ?? level

  /**
   * Independently of how many nested combiner levels `selectorLevels` collapses into one
   * shared selector-row level, the active leaf's structural children render at that SAME
   * level - the selector row already represents the one nesting step from the owner into the
   * combiner's content; there is no separate step from "selector" to "leaf". Do not resolve a
   * further level pair here - that would double the increment (see CombinerNodeViewer session
   * lesson; plain mode has no colorizing diff to reduce the level either way).
   */
  const { beforeLevel: selectorBeforeLevel, afterLevel: selectorAfterLevel } = useMemo(
    () => JsonSchemaNestingLevel.resolveNextLevelPair(currentBeforeLevel, currentAfterLevel, undefined),
    [currentBeforeLevel, currentAfterLevel],
  )

  const onSelectOption = useCallback((
    combinerNode: JsonSchemaTreeNode,
    option: SelectorOption<JsonSchemaTreeNode>,
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

  return (
    <div
      data-testid="json-schema-combiner-node-viewer"
      className="json-schema-property flex flex-col"
    >
      <SchemaNodeTitleRow
        data-precededby={precededBy}
        ownerNode={node}
        displayNode={activeLeaf}
        displayValue={activeLeafDisplayValue}
        contentVisibility={contentVisibility}
        isLastInList={isLastInList && !contentVisibility.showContentSection && !expandable}
        expandable={expandable}
        expanded={expanded}
        typeValueSuffix={titleRowTypeValueSuffix}
        onClickExpander={onClickExpander}
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
                () => <JsonSchemaCombinerOptionTypeValue node={nestedNode} />,
              )
            ))

            const selectedOption = options.find(
              (option) => option.node.id === selectorLevel.selectedNestedNode.id,
            ) ?? options[0] ?? null

            return (
              <CombinerSelectorRow
                key={selectorLevel.combinerNode.id}
                combinerKindLabel={selectorLevel.combinerKindLabel}
                showSelector={selectorLevel.showSelector}
                options={options}
                selectedOption={selectedOption}
                onSelectOption={(option) => onSelectOption(selectorLevel.combinerNode, option)}
              />
            )
          })}

          {showLeafChildren && (
            <>
              <NestingIndicatorTitleRow
                title={propertyNestingIndicatorTitle}
                usage={NestingIndicatorTitleRowUsage.JsonSchema}
                lastInvisible
              />
              {leafChildren.map((child, index) => (
                <JsonSchemaNodeViewer
                  key={child.id}
                  data-precededby={PrecededBy.JSON_SCHEMA_PROPERTY}
                  node={child}
                  isLastInList={index === leafChildren.length - 1}
                />
              ))}
            </>
          )}
        </AsyncLevelContextProvider>
      </LevelContext.Provider>
    </div>
  )
}
