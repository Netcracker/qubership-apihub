import { useDiffMetaKeys } from "@apihub/contexts/DiffMetaKeysContext";
import { useDisplayMode } from "@apihub/contexts/DisplayModeContext";
import { LayoutSide } from "@apihub/types/internal/LayoutSide";
import { isBindingNode } from "@apihub/utils/async-api/node-type-checkers";
import { DiffMetaKeys } from "@netcracker/qubership-apihub-api-data-model";
import { isDiffAdd, isDiffRemove } from "@netcracker/qubership-apihub-api-diff";
import { ChangedPropertyMetaData, NODE_LEVEL_DIFF_KEY, NodeDiffsSeverityPlacemennt } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { AsyncApiTreeNode, AsyncApiTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/aliases";
import { AsyncApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-kind";
import { AsyncApiTreeNodeValue, AsyncApiTreeNodeValueTypeBinding } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-value";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { JsoDiffsViewer } from "../JsoViewer/JsoDiffsViewer";
import { JsoViewer } from "../JsoViewer/JsoViewer";
import { buildRowDiffProps, toNodeDiffState } from "../shared-components/diffs/node-diff-props";
import { TextRow } from "../shared-components/TextRow/TextRow";
import { TextRowProps } from "../shared-components/TextRow/types";
import { TextValueVariant } from "../shared-components/TextValue/types";
import { TitleRow } from "../shared-components/TitleRow/TitleRow";
import { TitleRowProps } from "../shared-components/TitleRow/types";
import { ATTRIBUTE_PRECEDED_BY, PrecededBy, WithPrecededByProps } from "../shared-components/WithPrecededByProps";
import { isBindingNodeWithDiffs, isBindingsNodeWithDiffs } from "../shared-utilities/tree-node-guards";
import { Selector, SelectorOption } from "./Selector/Selector";
import { SizeVariant } from "./types/SizeVariant";

type BindingsNodeViewerProps = WithPrecededByProps & {
  node: AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.BINDINGS> | AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.BINDINGS>
  variant?: SizeVariant
}

export const BindingsNodeViewer: FC<BindingsNodeViewerProps> = (props) => {
  const { node, variant = SizeVariant.PRIMARY, [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  const displayMode = useDisplayMode()

  const diffMetaKeys = useDiffMetaKeys()

  const bindingsNodeMeta = node.meta()
  const brokenRef = bindingsNodeMeta?.brokenRef

  const [selectedBinding, setSelectedBinding] = useState<SelectorOption | null>(null)
  const bindingNodes: AsyncApiTreeNode[] | AsyncApiTreeNodeWithDiffs[] = node.nestedNodes()
  const bindingSelectorOptions = useMemo(() => (
    bindingNodes
      .filter(isBindingNode)
      .map((bindingNode, index) => {
        const protocol = bindingNode.value()?.protocol ?? ''
        const testId = `binding-${index}`
        if (isBindingNodeWithDiffs(bindingNode)) {
          return {
            title: protocol,
            node: bindingNode,
            testId: testId,
            // diffs
            diffs: bindingNode.diffs,
            diffsSummary: bindingNode.diffsSummary,
            descendantDiffs: bindingNode.descendantDiffs,
            descendantDiffsSummary: bindingNode.descendantDiffsSummary,
            diffsSeverities: bindingNode.diffsSeverities,
          }
        }
        return {
          title: protocol,
          node: bindingNode,
          testId: testId,
        }
      })
  ), [bindingNodes])

  const selectedBindingNode = selectedBinding?.node && isBindingNode(selectedBinding.node) ? selectedBinding.node : null
  const selectedBindingValue = selectedBindingNode?.value()
  const {
    version: bindingVersion = 'latest',
    binding: bindingValue = null,
  } = selectedBindingValue ?? {}

  useEffect(() => {
    if (bindingSelectorOptions.length > 0 && selectedBinding === null) {
      setSelectedBinding(bindingSelectorOptions[0])
    }
  }, [bindingSelectorOptions, selectedBinding])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const titleRowSubheader = useCallback((layoutSide: LayoutSide) => (
    !brokenRef ? (
      <Selector
        options={bindingSelectorOptions}
        selectedOption={selectedBinding}
        onSelectOption={setSelectedBinding}
        variant={SizeVariant.SECONDARY}
        // diffs
        layoutSide={layoutSide}
      />
    ) : <></>
  ), [bindingSelectorOptions, brokenRef, selectedBinding])

  const diffsProps: Pick<TitleRowProps, 'diff' | 'descendantDiffs' | 'diffsSeverities'> = useMemo(() => {
    if (isBindingsNodeWithDiffs(node)) {
      const nodeDiffState = toNodeDiffState<AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.BINDINGS>>(node)
      return buildRowDiffProps<AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.BINDINGS>>(nodeDiffState)
    }
    return {}
  }, [node])

  const bindingVersionDiffsProps: Pick<TextRowProps, 'diff' | 'diffsSeverities' | 'diffsSeverityPlacement'> = useMemo(() => {
    if (selectedBindingNode && isBindingNodeWithDiffs(selectedBindingNode)) {
      const nodeDiffState = toNodeDiffState<AsyncApiTreeNodeValueTypeBinding>(selectedBindingNode)
      return buildRowDiffProps<AsyncApiTreeNodeValueTypeBinding>(nodeDiffState, {
        diffKey: 'version',
        fallbackToNodeDiff: false,
        diffsSeverityPlacement: NodeDiffsSeverityPlacemennt.BindingVersionRow,
      })
    }
    return {}
  }, [selectedBindingNode])

  const bindingContent = useMemo(() => {
    if (!selectedBindingNode) {
      return null
    }
    if (isBindingNodeWithDiffs(selectedBindingNode) && diffMetaKeys) {
      const changedNodeMetadata = selectedBindingNode.diffs[NODE_LEVEL_DIFF_KEY]
      const mergedBindingValue = prepareBindingValueInCaseOfWhollyChanged(bindingValue, changedNodeMetadata, diffMetaKeys)
      return (
        <JsoDiffsViewer
          data-precededby={PrecededBy.BINDING_VERSION_ROW}
          mergedSource={mergedBindingValue}
          displayMode={displayMode}
          initialLevel={1}
          supportJsonSchema={true}
          // diffs specific
          diffMetaKeys={diffMetaKeys}
        />
      )
    }
    if (isBindingNode(selectedBindingNode)) {
      return (
        <JsoViewer
          data-precededby={PrecededBy.BINDING_VERSION_ROW}
          source={bindingValue}
          displayMode={displayMode}
          initialLevel={1}
          supportJsonSchema={true}
        />
      )
    }
    return null
  }, [selectedBindingNode, bindingValue, displayMode, diffMetaKeys])

  return (
    <div className="flex flex-col">
      <TitleRow
        data-precededby={precededBy}
        value='Bindings'
        expandable={false}
        expanded={true}
        variant={variant === SizeVariant.PRIMARY ? TextValueVariant.h3 : TextValueVariant.h5}
        subheader={titleRowSubheader}
        // diffs
        {...diffsProps}
      />
      <div data-testid={`${selectedBinding?.testId}-content`} className="flex flex-col">
        <TextRow
          data-precededby={PrecededBy.MESSAGE_SECTION_HEADER_HIGH_LEVEL}
          value={bindingVersion}
          variant={TextValueVariant.body}
          label="Version"
          labelFontWeight='medium'
          textFontWeight='medium'
          // diffs
          {...bindingVersionDiffsProps}
        />
        {bindingContent}
      </div>
    </div>
  )
}

function prepareBindingValueInCaseOfWhollyChanged(
  bindingValue: Record<string, unknown> | null,
  changedNodeMetadata: ChangedPropertyMetaData | undefined,
  diffMetaKeys: DiffMetaKeys,
): Record<PropertyKey, unknown> | null {
  if (!bindingValue) {
    return null
  }
  const diff = changedNodeMetadata?.data
  if (!diff) {
    return bindingValue
  }
  const { diffsMetaKey } = diffMetaKeys
  const extendedBindingValue = {
    ...bindingValue,
    [diffsMetaKey]: Object.keys(bindingValue).reduce((acc, key) => {
      acc[key] = diff
      if (isDiffAdd(diff)) {
        const afterValue = bindingValue[key]
        acc[key] = { ...diff, afterValue: afterValue }
      }
      if (isDiffRemove(diff)) {
        const beforeValue = bindingValue[key]
        acc[key] = { ...diff, beforeValue: beforeValue }
      }
      return acc
    }, {} as Record<PropertyKey, unknown>)
  }
  return extendedBindingValue
}
