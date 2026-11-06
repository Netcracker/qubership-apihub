import { NODE_LEVEL_DIFF_KEY } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { AsyncApiTreeNode, AsyncApiTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/aliases"
import { AsyncApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-kind"
import { AsyncApiTreeNodeValueTypeExtensions } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-value"
import { FC, useMemo } from "react"
import { buildRowDiffProps, toNodeDiffState } from "../shared-components/diffs/node-diff-props"
import { ExtensionsSection, ExtensionsSectionProps } from "../shared-components/ExtensionsSection/ExtensionsSection"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { ATTRIBUTE_PRECEDED_BY, WithPrecededByProps } from "../shared-components/WithPrecededByProps"
import { isExtensionsNodeWithDiffs } from "../shared-utilities/tree-node-guards"

type SpecificationExtensionsProps = WithPrecededByProps & {
  node:
  | AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.EXTENSIONS>
  | AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.EXTENSIONS>
}

// TODO: Make it row-like component
export const ExtensionsNodeViewer: FC<SpecificationExtensionsProps> = (props) => {
  const { node, [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  const value = node.value()
  const extensions = value?.rawValues ?? {}

  const diffsProps: ExtensionsSectionProps['titleRowDiffProps'] = useMemo(() => {
    if (isExtensionsNodeWithDiffs(node)) {
      const nodeDiffState = toNodeDiffState<AsyncApiTreeNodeValueTypeExtensions>(node)
      const rowDiffProps = buildRowDiffProps<AsyncApiTreeNodeValueTypeExtensions>(nodeDiffState)
      return {
        ...rowDiffProps,
        // case of whole node diffs
        highlightingMode: node.diffs[NODE_LEVEL_DIFF_KEY]?.highlightingMode,
      }
    }
    return {}
  }, [node])

  return (
    <ExtensionsSection
      data-precededby={precededBy}
      rawValues={extensions}
      variant={TextValueVariant.h3}
      titleRowDiffProps={diffsProps}
      // AsyncAPI does not hide unchanged nodes yet
      hideUnchangedNodes={false}
    />
  )
}
