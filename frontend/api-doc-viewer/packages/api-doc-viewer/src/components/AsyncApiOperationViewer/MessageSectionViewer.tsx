import { isMessageChannelNode, isMessageContentNode, isMessageOperationNode } from "@apihub/utils/async-api/node-type-checkers";
import { AsyncApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/aliases";
import { AsyncApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-kind";
import { FC } from "react";
import { ATTRIBUTE_PRECEDED_BY, WithPrecededByProps } from "../shared-components/WithPrecededByProps";
import { MessageChannelNodeViewer } from "./MessageChannelNodeViewer";
import { MessageContentNodeViewer } from "./MessageContentNodeViewer";
import { MessageOperationNodeViewer } from "./MessageOperationNodeViewer";

type MessageSectionViewerProps = WithPrecededByProps & {
  node: AsyncApiTreeNode<
    | typeof AsyncApiTreeNodeKinds.MESSAGE_CONTENT
    | typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL
    | typeof AsyncApiTreeNodeKinds.MESSAGE_OPERATION
  >
}

export const MessageSectionViewer: FC<MessageSectionViewerProps> = (props) => {
  const { node, [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  if (isMessageContentNode(node)) {
    return <MessageContentNodeViewer data-precededby={precededBy} node={node} />
  }
  if (isMessageChannelNode(node)) {
    return <MessageChannelNodeViewer data-precededby={precededBy} node={node} />
  }
  if (isMessageOperationNode(node)) {
    return <MessageOperationNodeViewer data-precededby={precededBy} node={node} />
  }

  return null
}