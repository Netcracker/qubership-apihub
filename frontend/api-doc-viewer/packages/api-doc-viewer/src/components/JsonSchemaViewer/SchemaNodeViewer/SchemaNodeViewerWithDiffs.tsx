import { useCustomizationOptions } from "@apihub/contexts/CustomizationOptionsContext"
import { useDisplayMode } from "@apihub/contexts/DisplayModeContext"
import { LevelContext, useLevelContext } from "@apihub/contexts/LevelContext"
import { useAsyncLevelContext } from "@apihub/contexts/AsyncLevelContext/AsyncLevelContext"
import { AsyncLevelContextProvider } from "@apihub/contexts/AsyncLevelContext/AsyncLevelContextProvider"
import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { JsonSchemaTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/node-kind"
import {
  resolvePlainPropertyExpanderExpanded,
  resolvePlainPropertyInitiallyExpanded,
  resolvePlainPropertyIsExpandable,
  resolvePlainPropertyNodeVisibility,
} from "@netcracker/qubership-apihub-next-data-model/building-service/json-schema/tree/node-visibility-data/kind-property"
import {
  resolveJsonSchemaPropertyNodeVisibility,
} from "@netcracker/qubership-apihub-next-data-model/building-service/json-schema/tree-with-diffs/node-visibility-data/kind-property"
import { resolveJsonSchemaPropertyInitiallyExpandedWithDiffs } from "@netcracker/qubership-apihub-next-data-model/building-service/json-schema/tree-with-diffs/node-visibility-data/kind-property-expand"
import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from "react"
import { NestingIndicatorTitleRow } from "@apihub/components/shared-components/NestingIndicatorTitleRow/NestingIndicatorTitleRow"
import { NestingIndicatorTitleRowUsage } from "@apihub/components/shared-components/NestingIndicatorTitleRow/types"
import {
  ATTRIBUTE_PRECEDED_BY,
  PrecededBy,
  WithPrecededByProps,
} from "../../shared-components/WithPrecededByProps"
import { JsonSchemaRowDiffs } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/tree-with-diffs/property-row-diffs"
import { NodeDiffsSeverityPlacemennt } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { useJsonSchemaViewerContext } from "../JsonSchemaViewerContext"
import { JsonSchemaNodeTypeCheckers } from "../utils/node-type-checkers"
import { JsonSchemaNodeViewerWithDiffs } from "../JsonSchemaNodeViewerWithDiffs"
import { useOptionalUnchangedBlocksContext } from "../UnchangedBlocksContext"
import { JsonSchemaNestingIndicatorTypeValueWithDiffs } from "./TypeValue/JsonSchemaNestingIndicatorTypeValueWithDiffs"
import { JsonSchemaNestingLevel } from "../utils/resolve-nesting-level"
import { SchemaNodeChildrenListWithDiffs } from "./SchemaNodeChildrenListWithDiffs"
import { SchemaNodePlainContent } from "./SchemaNodePlainContent"
import { SchemaNodeTitleRowWithDiffs } from "./SchemaNodeTitleRowWithDiffs"

function isJsonSchemaPropertyNodeWithDiffs(
  node: JsonSchemaTreeNodeWithDiffs,
): node is JsonSchemaTreeNodeWithDiffs<typeof JsonSchemaTreeNodeKinds.PROPERTY> {
  return node.kind === JsonSchemaTreeNodeKinds.PROPERTY
}

export type SchemaNodeViewerWithDiffsProps = WithPrecededByProps & {
  node: JsonSchemaTreeNodeWithDiffs
  isLastInList?: boolean
}

export const SchemaNodeViewerWithDiffs: FC<SchemaNodeViewerWithDiffsProps> = (props) => {
  const {
    node,
    isLastInList = false,
    [ATTRIBUTE_PRECEDED_BY]: precededBy,
  } = props

  const displayMode = useDisplayMode()
  const level = useLevelContext()
  const customizationOptions = useCustomizationOptions()
  const { expandedDepth, materializeChildren, treeRevision } = useJsonSchemaViewerContext()
  const propertyNodeWithDiffs = isJsonSchemaPropertyNodeWithDiffs(node) ? node : undefined
  const unchangedBlocksContext = useOptionalUnchangedBlocksContext()

  const visibility = useMemo(
    () => propertyNodeWithDiffs
      ? resolveJsonSchemaPropertyNodeVisibility(propertyNodeWithDiffs, displayMode)
      : resolvePlainPropertyNodeVisibility(node.value(), displayMode),
    [displayMode, node, propertyNodeWithDiffs],
  )

  const children = useMemo(
    () => node.childrenNodes(),
    // treeRevision: lazy materialization mutates tree in place
    // eslint-disable-next-line react-hooks/exhaustive-deps -- treeRevision
    [node, treeRevision],
  )

  const expandable = useMemo(
    () => resolvePlainPropertyIsExpandable(node),
    // treeRevision: lazy materialization adds children without changing node identity
    // eslint-disable-next-line react-hooks/exhaustive-deps -- treeRevision
    [node, treeRevision],
  )

  const initiallyExpanded = useMemo(
    () => {
      if (unchangedBlocksContext?.hideUnchangedNodes) {
        return resolveJsonSchemaPropertyInitiallyExpandedWithDiffs(node, {
          expandedDepth,
          level,
          hideUnchangedNodes: true,
          isRoot: node.kind === JsonSchemaTreeNodeKinds.ROOT,
        })
      }
      return resolvePlainPropertyInitiallyExpanded(node, { expandedDepth, level })
    },
    [expandedDepth, level, node, unchangedBlocksContext?.hideUnchangedNodes],
  )

  const effectiveInitiallyExpanded = useMemo(
    () => resolvePlainPropertyExpanderExpanded(node, initiallyExpanded),
    // treeRevision: lazy materialization adds children without changing node identity
    // eslint-disable-next-line react-hooks/exhaustive-deps -- treeRevision
    [initiallyExpanded, node, treeRevision],
  )

  const [expanded, setExpanded] = useState(effectiveInitiallyExpanded)

  useEffect(() => {
    setExpanded((currentExpanded) => resolvePlainPropertyExpanderExpanded(node, currentExpanded))
  }, [node, treeRevision])

  const onClickExpander = useCallback(() => {
    setExpanded((previousExpanded) => {
      const nextExpanded = !previousExpanded
      if (nextExpanded) {
        materializeChildren(node)
      }
      return resolvePlainPropertyExpanderExpanded(node, nextExpanded)
    })
  }, [materializeChildren, node])

  const suppressRootNesting =
    !!customizationOptions?.suppressRootNestingIndicator &&
    JsonSchemaNodeTypeCheckers.isRootNode(node) &&
    !visibility.showExtensionsRow &&
    children.length > 0

  const showNodeBody = suppressRootNesting || !expandable || expanded

  const nestingIndicatorTitle = useCallback((layoutSide: LayoutSide): ReactNode => (
    <JsonSchemaNestingIndicatorTypeValueWithDiffs
      node={node}
      meta={node.meta()}
      layoutSide={layoutSide}
    />
  ), [node])

  const nestingIndicatorRowColorizingDiff = useMemo(
    () => JsonSchemaRowDiffs.NodeLevel.takeNestingIndicatorRowColorizingDiff(node),
    [node],
  )

  const asyncLevel = useAsyncLevelContext()
  const currentBeforeLevel = asyncLevel?.beforeLevel ?? level
  const currentAfterLevel = asyncLevel?.afterLevel ?? level
  const { beforeLevel: nextBeforeLevel, afterLevel: nextAfterLevel } = useMemo(
    () => JsonSchemaNestingLevel.resolveNextLevelPair(currentBeforeLevel, currentAfterLevel, nestingIndicatorRowColorizingDiff),
    [currentBeforeLevel, currentAfterLevel, nestingIndicatorRowColorizingDiff],
  )

  return (
    <div
      data-testid="json-schema-node-viewer"
      data-name="JsonNode"
      className="json-schema-property flex flex-col"
    >
      {!suppressRootNesting && (
        <SchemaNodeTitleRowWithDiffs
          data-precededby={precededBy}
          ownerNode={node}
          contentVisibility={visibility}
          isLastInList={isLastInList}
          expandable={expandable}
          expanded={expanded}
          onClickExpander={onClickExpander}
        />
      )}

      {showNodeBody && (
        <>
          <SchemaNodePlainContent
            node={node}
            isLastInList={isLastInList && children.length === 0}
          />

          {children.length > 0 && (
            <LevelContext.Provider value={level + 1}>
              <AsyncLevelContextProvider beforeLevel={nextBeforeLevel} afterLevel={nextAfterLevel}>
                {!suppressRootNesting && (
                  <NestingIndicatorTitleRow
                    title={nestingIndicatorTitle}
                    usage={NestingIndicatorTitleRowUsage.JsonSchema}
                    lastInvisible
                    diff={nestingIndicatorRowColorizingDiff}
                    diffsSeverities={node.diffsSeverities}
                    diffsSeverityPlacement={NodeDiffsSeverityPlacemennt.NestingIndicatorRow}
                  />
                )}
                {unchangedBlocksContext ? (
                  <SchemaNodeChildrenListWithDiffs
                    children={children}
                  />
                ) : (
                  children.map((child, index) => (
                    <JsonSchemaNodeViewerWithDiffs
                      key={child.id}
                      data-precededby={PrecededBy.JSON_SCHEMA_PROPERTY}
                      node={child}
                      isLastInList={index === children.length - 1}
                    />
                  ))
                )}
              </AsyncLevelContextProvider>
            </LevelContext.Provider>
          )}
        </>
      )}
    </div>
  )
}
