import { AsyncApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/aliases";
import { AsyncApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-kind";
import { FC } from "react";
import { MessageContentNodeViewer } from "./MessageContentNodeViewer";
import { MessageChannelNodeViewer } from "./MessageChannelNodeViewer";
import { MessageOperationNodeViewer } from "./MessageOperationNodeViewer";
import { isMessageChannelNode, isMessageContentNode, isMessageOperationNode } from "@apihub/utils/async-api/node-type-checkers";

type MessageSectionViewerProps = {
  node: AsyncApiTreeNode<
    | typeof AsyncApiTreeNodeKinds.MESSAGE_CONTENT
    | typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL
    | typeof AsyncApiTreeNodeKinds.MESSAGE_OPERATION
  >
}

export const MessageSectionViewer: FC<MessageSectionViewerProps> = (props) => {
  const { node } = props

  if (isMessageContentNode(node)) {
    return <MessageContentNodeViewer node={node} />
  }
  if (isMessageChannelNode(node)) {
    return <MessageChannelNodeViewer node={node} />
  }
  if (isMessageOperationNode(node)) {
    return <MessageOperationNodeViewer node={node} />
  }

  return null
}