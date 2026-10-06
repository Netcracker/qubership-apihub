import { useCustomizationOptions } from "@apihub/contexts/CustomizationOptionsContext"
import { useDisplayMode } from "@apihub/contexts/DisplayModeContext"
import { LevelContext, useLevelContext } from "@apihub/contexts/LevelContext"
import { useAsyncLevelContext } from "@apihub/contexts/AsyncLevelContext/AsyncLevelContext"
import { AsyncLevelContextProvider } from "@apihub/contexts/AsyncLevelContext/AsyncLevelContextProvider"
import { JsonSchemaTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import {
  resolvePlainPropertyExpanderExpanded,
  resolvePlainPropertyInitiallyExpanded,
  resolvePlainPropertyIsExpandable,
  resolvePlainPropertyNodeVisibility,
} from "@netcracker/qubership-apihub-next-data-model/building-service/json-schema/tree/node-visibility-data/kind-property"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { NestingIndicatorTitleRow } from "@apihub/components/shared-components/NestingIndicatorTitleRow/NestingIndicatorTitleRow"
import { NestingIndicatorTitleRowUsage } from "@apihub/components/shared-components/NestingIndicatorTitleRow/types"
import {
  ATTRIBUTE_PRECEDED_BY,
  PrecededBy,
  WithPrecededByProps,
} from "../../shared-components/WithPrecededByProps"
import { useJsonSchemaViewerContext } from "../JsonSchemaViewerContext"
import { JsonSchemaNodeTypeCheckers } from "../utils/node-type-checkers"
import { JsonSchemaNodeViewer } from "../JsonSchemaNodeViewer"
import { JsonSchemaNestingIndicatorTypeValue } from "./TypeValue/JsonSchemaNestingIndicatorTypeValue"
import { JsonSchemaNestingLevel } from "../utils/resolve-nesting-level"
import { SchemaNodePlainContent } from "./SchemaNodePlainContent"
import { SchemaNodeTitleRow } from "./SchemaNodeTitleRow"

export type SchemaNodeViewerProps = WithPrecededByProps & {
  node: JsonSchemaTreeNode
  isLastInList?: boolean
}

export const SchemaNodeViewer: FC<SchemaNodeViewerProps> = (props) => {
  const {
    node,
    isLastInList = false,
    [ATTRIBUTE_PRECEDED_BY]: precededBy,
  } = props

  const displayMode = useDisplayMode()
  const level = useLevelContext()
  const customizationOptions = useCustomizationOptions()
  const { expandedDepth, materializeChildren, treeRevision } = useJsonSchemaViewerContext()

  const visibility = useMemo(
    () => resolvePlainPropertyNodeVisibility(node.value(), displayMode),
    [displayMode, node],
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
    () => resolvePlainPropertyInitiallyExpanded(node, { expandedDepth, level }),
    [expandedDepth, level, node],
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

  const nestingIndicatorTitle = useCallback(
    () => <JsonSchemaNestingIndicatorTypeValue node={node} />,
    [node],
  )

  const asyncLevel = useAsyncLevelContext()
  const currentBeforeLevel = asyncLevel?.beforeLevel ?? level
  const currentAfterLevel = asyncLevel?.afterLevel ?? level
  const { beforeLevel: nextBeforeLevel, afterLevel: nextAfterLevel } = useMemo(
    () => JsonSchemaNestingLevel.resolveNextLevelPair(currentBeforeLevel, currentAfterLevel, undefined),
    [currentBeforeLevel, currentAfterLevel],
  )

  return (
    <div
      data-testid="json-schema-node-viewer"
      data-name="JsonNode"
      className="json-schema-property flex flex-col"
    >
      {!suppressRootNesting && (
        <SchemaNodeTitleRow
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
                  />
                )}
                {children.map((child, index) => (
                  <JsonSchemaNodeViewer
                    key={child.id}
                    data-precededby={PrecededBy.JSON_SCHEMA_PROPERTY}
                    node={child}
                    isLastInList={index === children.length - 1}
                  />
                ))}
              </AsyncLevelContextProvider>
            </LevelContext.Provider>
          )}
        </>
      )}
    </div>
  )
}
