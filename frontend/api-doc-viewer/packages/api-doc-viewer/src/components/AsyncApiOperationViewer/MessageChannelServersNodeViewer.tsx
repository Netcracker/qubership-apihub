import { isServerNode } from "@apihub/utils/async-api/node-type-checkers";
import { AsyncApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/aliases";
import { AsyncApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-kind";
import { FC, memo, useMemo } from "react";
import { MessageChannelServerNodeViewer } from "./MessageChannelServerNodeViewer";
import { TitleRow, TitleVariant } from "./TitleRow";

type MessageChannelServersNodeViewerProps = {
  node: AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.SERVERS>
}

export const MessageChannelServersNodeViewer: FC<MessageChannelServersNodeViewerProps> = memo(props => {
  const { node } = props

  const children: AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.SERVER>[] = useMemo(
    () => {
      const children: AsyncApiTreeNode[] = node.childrenNodes()
      return children.filter(isServerNode)
    },
    [node]
  )

  return (
    <div className='flex flex-col gap-2'>
      <TitleRow
        value='Servers'
        expandable={false}
        expanded={true}
        variant={TitleVariant.h3}
      />
      {children.map(child => (
        <MessageChannelServerNodeViewer key={child.id} node={child} />
      ))}
    </div>
  )
})
