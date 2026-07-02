import { useDisplayMode } from "@apihub/contexts/DisplayModeContext"
import { LevelContext, useLevelContext } from "@apihub/contexts/LevelContext"
import { prepareJsonSchemaForJsoViewer } from "@apihub/utils/jso/prepare-json-schema-to-jso-viewers"
import { JsoTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/jso/types/aliases"
import { FC, useCallback, useMemo, useState } from "react"
import { JsonSchemaViewer } from "../JsonSchemaViewer/JsonSchemaViewer"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { TitleRow } from "../shared-components/TitleRow/TitleRow"
import { TitleRowUsage } from "../shared-components/TitleRow/types"
import { ATTRIBUTE_PRECEDED_BY, PrecededBy, WithPrecededByProps } from "../shared-components/WithPrecededByProps"
import { JsoValue } from "./JsoValue/JsoValue"

type JsoPropertyNodeViewerProps = WithPrecededByProps & {
  node: JsoTreeNode
  supportJsonSchema?: boolean
}

export const JsoPropertyNodeViewer: FC<JsoPropertyNodeViewerProps> = (props) => {
  const { node, supportJsonSchema = false } = props

  // indent-specific
  const { [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  const displayMode = useDisplayMode()
  const level = useLevelContext()

  const [expanded, setExpanded] = useState(true)
  const onClickExpander = useCallback(() => {
    setExpanded(prevExpanded => !prevExpanded)
  }, [])

  const nodeValue = node.value()

  const expandable = useMemo(() => {
    return !!nodeValue && !nodeValue.isPrimitive
  }, [nodeValue])

  const subheader = useCallback(
    () => {
      if (!nodeValue) {
        return <></>
      }

      return (
        <JsoValue
          isVisible={nodeValue.isPrimitive}
          value={nodeValue.value}
          appearance={nodeValue.isPredefinedValueSet ? 'block' : 'text'}
        />
      )
    },
    [nodeValue],
  )

  const childrenProperties = node.childrenNodes()

  // JSON Schema properties

  const jsonSchema = useMemo(() => (
    supportJsonSchema
      ? prepareJsonSchemaForJsoViewer(node.key, nodeValue)
      : undefined
  ), [node.key, nodeValue, supportJsonSchema])

  if (jsonSchema) {
    return (
      <JsonSchemaViewer
        key={node.id}
        schema={jsonSchema}
        expandedDepth={2}
        displayMode={displayMode}
        overriddenKind='parameters'
      />
    )
  }

  // ---

  return (
    <div data-testid='jso-property-node-viewer' className="flex flex-col jso-property">
      <TitleRow
        data-precededby={precededBy}
        value={`${node.key}`}
        expandable={expandable}
        expanded={expanded}
        onClickExpander={onClickExpander}
        variant={TextValueVariant.body2}
        enableHeaderValue={!nodeValue?.isArrayItem}
        subheader={subheader}
        usage={TitleRowUsage.JsoProperty}
      />
      {expanded && (
        <LevelContext.Provider
          value={level + 1}
        >
          {childrenProperties.map(childProperty => (
            <JsoPropertyNodeViewer
              data-precededby={PrecededBy.JSO_PROPERTY}
              node={childProperty}
              supportJsonSchema={supportJsonSchema}
            />
          ))}
        </LevelContext.Provider>
      )}
    </div>
  )
}
