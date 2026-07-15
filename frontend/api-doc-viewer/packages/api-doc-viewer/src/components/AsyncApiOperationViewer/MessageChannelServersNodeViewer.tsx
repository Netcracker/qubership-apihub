import { isServerNode } from "@apihub/utils/async-api/node-type-checkers";
import { AsyncApiTreeNode, AsyncApiTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/aliases";
import { AsyncApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-kind";
import { AsyncApiTreeNodeValue } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-value";
import { FC, memo, useMemo } from "react";
import { TextValueVariant } from "../shared-components/TextValue/types";
import { TitleRow } from "../shared-components/TitleRow/TitleRow";
import { TitleRowProps } from "../shared-components/TitleRow/types";
import { ATTRIBUTE_PRECEDED_BY, PrecededBy, WithPrecededByProps } from "../shared-components/WithPrecededByProps";
import { buildRowDiffProps, toNodeDiffState } from "../shared-components/diffs/node-diff-props";
import { isServersNodeWithDiffs } from "../shared-utilities/tree-node-guards";
import { MessageChannelServerNodeViewer } from "./MessageChannelServerNodeViewer/MessageChannelServerNodeViewer";

type MessageChannelServersNodeViewerProps = WithPrecededByProps & {
  node: AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.SERVERS>
}

export const MessageChannelServersNodeViewer: FC<MessageChannelServersNodeViewerProps> = memo(props => {
  const { node, [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  const children: (AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.SERVER> | AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.SERVER>)[] = useMemo(
    () => {
      const children: AsyncApiTreeNode[] | AsyncApiTreeNodeWithDiffs[] = node.childrenNodes()
      return children.filter(isServerNode)
    },
    [node]
  )

  const titleRowDiffProps: Pick<TitleRowProps, 'diff' | 'descendantDiffs' | 'diffsSeverities'> = useMemo(() => {
    if (isServersNodeWithDiffs(node)) {
      const nodeDiffState = toNodeDiffState<AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.SERVERS>>(node)
      return buildRowDiffProps<AsyncApiTreeNodeValue<typeof AsyncApiTreeNodeKinds.SERVERS>>(nodeDiffState)
    }
    return {}
  }, [node])

  return (
    <div className='flex flex-col'>
      <TitleRow
        data-precededby={precededBy}
        value='Servers'
        expandable={false}
        expanded={true}
        variant={TextValueVariant.h3}
        // diffs
        {...titleRowDiffProps}
      />
      {children.map((child, index) => (
        <MessageChannelServerNodeViewer
          data-precededby={
            index === 0
              ? PrecededBy.MESSAGE_SECTION_HEADER_HIGH_LEVEL
              : PrecededBy.SERVER_BLOCK
          }
          key={child.id}
          node={child}
        />
      ))}
    </div>
  )
})
