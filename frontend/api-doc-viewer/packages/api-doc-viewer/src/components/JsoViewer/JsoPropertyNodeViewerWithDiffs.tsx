import { useAsyncLevelContext } from "@apihub/contexts/AsyncLevelContext/AsyncLevelContext"
import { AsyncLevelContextProvider } from "@apihub/contexts/AsyncLevelContext/AsyncLevelContextProvider"
import { useDiffMetaKeys } from "@apihub/contexts/DiffMetaKeysContext"
import { useDisplayMode } from "@apihub/contexts/DisplayModeContext"
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "@apihub/types/LayoutMode"
import { isSameDiffActionForAll } from "@apihub/utils/jso/infer-node-change-from-children-changes"
import { prepareJsonSchemaForJsoDiffsViewer } from "@apihub/utils/jso/prepare-json-schema-to-jso-viewers"
import { NODE_LEVEL_DIFF_KEY } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { JsoTreeNodeDiffsSource } from "@netcracker/qubership-apihub-next-data-model/model/jso/tree-with-diffs/node-diffs-source"
import { JsoTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/jso/types/aliases"
import { JsoPropertyValueTypes } from "@netcracker/qubership-apihub-next-data-model/model/jso/types/node-value-type"
import { FC, useCallback, useMemo, useState } from "react"
import { JsonSchemaDiffViewer } from "../JsonSchemaViewer/JsonSchemaDiffViewer"
import { UxMarkerPanel } from "../kit/ux/UxMarkerPanel/UxMarkerPanel"
import { buildRowDiffProps, toNodeDiffState } from "../shared-components/diffs/node-diff-props"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { TitleRow } from "../shared-components/TitleRow/TitleRow"
import { TitleRowProps, TitleRowUsage } from "../shared-components/TitleRow/types"
import { ATTRIBUTE_PRECEDED_BY, PrecededBy, WithPrecededByProps } from "../shared-components/WithPrecededByProps"
import { JsoValueWithDiffs } from "./JsoValue/JsoValueWithDiffs"

type JsoPropertyNodeViewerWithDiffsProps = WithPrecededByProps & {
  node: JsoTreeNodeWithDiffs
  supportJsonSchema?: boolean
}

export const JsoPropertyNodeViewerWithDiffs: FC<JsoPropertyNodeViewerWithDiffsProps> = (props) => {
  const { node, supportJsonSchema = false } = props

  // indent-specific
  const { [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  const displayMode = useDisplayMode()
  const diffMetaKeys = useDiffMetaKeys()
  const { beforeLevel, afterLevel } = useAsyncLevelContext()!

  const [expanded, setExpanded] = useState(true)
  const onClickExpander = useCallback(() => {
    setExpanded(prevExpanded => !prevExpanded)
  }, [])

  const nodeValue = node.value()

  const nodeDiffs = node.diffs
  const nodeDescendantDiffsSummary = node.descendantDiffsSummary

  const nodeValueDiff = useMemo(() => nodeDiffs[NODE_LEVEL_DIFF_KEY], [nodeDiffs])

  const subheader = useCallback(
    (layoutSide: LayoutSide) => {
      if (!nodeValue) {
        return <></>
      }

      if (!nodeValueDiff) {
        return (
          <div className='flex flex-row gap-2'>
            <JsoValueWithDiffs
              isVisible={nodeValue.after.isPrimitive}
              value={nodeValue.after.value}
              appearance={nodeValue.after.isPredefinedValueSet ? 'block' : 'text'}
            />
            {!expanded && (
              <UxMarkerPanel
                values={Array.from(nodeDescendantDiffsSummary)}
              />
            )}
          </div>
        )
      }

      const { styles } = nodeValueDiff

      if (layoutSide === ORIGIN_LAYOUT_SIDE) {
        return (
          <JsoValueWithDiffs
            isVisible={styles.before.isContentVisible}
            value={nodeValue.before.value}
            appearance={nodeValue.before.isPredefinedValueSet ? 'block' : 'text'}
            textHighlighterColor={styles.before.textHighlighterColor}
            borderShadowColor={styles.before.borderShadowColor}
          />
        )
      }

      if (layoutSide === CHANGED_LAYOUT_SIDE) {
        return (
          <JsoValueWithDiffs
            isVisible={styles.after.isContentVisible}
            value={nodeValue.after.value}
            appearance={nodeValue.after.isPredefinedValueSet ? 'block' : 'text'}
            textHighlighterColor={styles.after.textHighlighterColor}
            borderShadowColor={styles.after.borderShadowColor}
          />
        )
      }

      return <></>
    },
    [expanded, nodeDescendantDiffsSummary, nodeValue, nodeValueDiff]
  )

  const titleRowDiffProps: Pick<TitleRowProps, 'diff' | 'descendantDiffs' | 'diffsSeverities'> = useMemo(() => {
    const nodeDiffState = toNodeDiffState<JsoTreeNodeDiffsSource>(node)
    return buildRowDiffProps<JsoTreeNodeDiffsSource>(nodeDiffState, {
      resolveDiff: () => nodeValueDiff,
    })
  }, [node, nodeValueDiff])

  const childrenProperties = node.childrenNodes()

  // Flags

  const expandable = useMemo(() => {
    const hasValue = !!nodeValue
    // TODO 19.05.26 // In future may be moved to next-data-model
    const isBeforeValueExpandable = !nodeValue?.before.isPrimitive && nodeValue?.before.valueType !== JsoPropertyValueTypes.UNKNOWN
    const isAfterValueExpandable = !nodeValue?.after.isPrimitive && nodeValue?.after.valueType !== JsoPropertyValueTypes.UNKNOWN
    return hasValue && (isBeforeValueExpandable || isAfterValueExpandable)
  }, [nodeValue])

  const enableHeaderValue = useMemo(() => {
    return !nodeValue?.before.isArrayItem && !nodeValue?.after.isArrayItem
  }, [nodeValue])

  // JSON Schema properties

  const jsonSchema = useMemo(() => {
    return (
      supportJsonSchema
        ? prepareJsonSchemaForJsoDiffsViewer(node.key, nodeValue, nodeValueDiff, diffMetaKeys)
        : undefined
    )
  }, [diffMetaKeys, node.key, nodeValue, nodeValueDiff, supportJsonSchema])

  if (jsonSchema) {
    if (!diffMetaKeys) {
      console.error('diffMetaKeys is not defined, but JSON Schema node is defined', node)
      return null
    }
    return (
      <JsonSchemaDiffViewer
        key={node.id}
        schema={jsonSchema}
        expandedDepth={2}
        displayMode={displayMode}
        layoutMode={SIDE_BY_SIDE_DIFFS_LAYOUT_MODE}
        metaKeys={diffMetaKeys}
        overriddenKind='parameters'
      />
    )
  }

  // ---

  const allChildrenAreDiffs = isSameDiffActionForAll(childrenProperties)

  const [nextBeforeLevel, nextAfterLevel] = (() => {
    let _nextBeforeLevel = beforeLevel + 1
    let _nextAfterLevel = afterLevel + 1

    const [firstJsoProperty] = childrenProperties
    const firstChildNodeValueDiff = firstJsoProperty?.diffs[NODE_LEVEL_DIFF_KEY]
    if (firstChildNodeValueDiff && allChildrenAreDiffs) {
      _nextBeforeLevel = firstChildNodeValueDiff.flags.before.increaseLevel ? beforeLevel + 1 : beforeLevel
      _nextAfterLevel = firstChildNodeValueDiff.flags.after.increaseLevel ? afterLevel + 1 : afterLevel
    }

    return [_nextBeforeLevel, _nextAfterLevel]
  })()

  return (
    <div data-testid='jso-property-node-viewer' className="flex flex-col jso-property">
      <TitleRow
        data-precededby={precededBy}
        value={`${node.key}`}
        expandable={expandable}
        expanded={expanded}
        onClickExpander={expandable ? onClickExpander : undefined}
        variant={TextValueVariant.body2}
        enableHeaderValue={enableHeaderValue}
        subheader={subheader}
        usage={TitleRowUsage.JsoProperty}
        highlightingMode={nodeValueDiff?.highlightingMode}
        // diffs
        {...titleRowDiffProps}
      />
      {expanded && (
        <AsyncLevelContextProvider
          beforeLevel={nextBeforeLevel}
          afterLevel={nextAfterLevel}
        >
          {childrenProperties.map(childProperty => (
            <JsoPropertyNodeViewerWithDiffs
              data-precededby={PrecededBy.JSO_PROPERTY}
              key={childProperty.id}
              node={childProperty}
              supportJsonSchema={supportJsonSchema}
            />
          ))}
        </AsyncLevelContextProvider>
      )}
    </div>
  )
}
