import { AsyncApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/aliases";
import { AsyncApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-kind";

// Message

export function isMessageNode(
  node: AsyncApiTreeNode
): node is AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.MESSAGE> {
  return node.kind === AsyncApiTreeNodeKinds.MESSAGE;
}

export function isMessageSectionSelectorNode(
  node: AsyncApiTreeNode
): node is AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR> {
  return node.kind === AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR;
}

export function isMessageContentNode(
  node: AsyncApiTreeNode
): node is AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.MESSAGE_CONTENT> {
  return node.kind === AsyncApiTreeNodeKinds.MESSAGE_CONTENT;
}

export function isMessageContentHeadersNode(
  node: AsyncApiTreeNode
): node is AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.MESSAGE_HEADERS> {
  return node.kind === AsyncApiTreeNodeKinds.MESSAGE_HEADERS && node.key === 'headers';
}

export function isMessageContentPayloadNode(
  node: AsyncApiTreeNode
): node is AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD> {
  return node.kind === AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD && node.key === 'payload';
}

export function isMessageChannelNode(
  node: AsyncApiTreeNode
): node is AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL> {
  return node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL;
}

export function isMessageChannelParametersNode(
  node: AsyncApiTreeNode
): node is AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS> {
  return node.kind === AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS;
}

export function isMessageOperationNode(
  node: AsyncApiTreeNode
): node is AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.MESSAGE_OPERATION> {
  return node.kind === AsyncApiTreeNodeKinds.MESSAGE_OPERATION;
}

// Shared

export function isExtensionsNode(
  node: AsyncApiTreeNode
): node is AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.EXTENSIONS> {
  return node.kind === AsyncApiTreeNodeKinds.EXTENSIONS;
}

export function isBindingsNode(
  node: AsyncApiTreeNode
): node is AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.BINDINGS> {
  return node.kind === AsyncApiTreeNodeKinds.BINDINGS;
}

export function isBindingNode(
  node: AsyncApiTreeNode
): node is AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.BINDING> {
  return node.kind === AsyncApiTreeNodeKinds.BINDING;
}

export function isMessageSectionNode(
  node: AsyncApiTreeNode
): node is AsyncApiTreeNode<
  | typeof AsyncApiTreeNodeKinds.MESSAGE_CONTENT
  | typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL
  | typeof AsyncApiTreeNodeKinds.MESSAGE_OPERATION
> {
  return isMessageContentNode(node) || isMessageChannelNode(node) || isMessageOperationNode(node);
}

export function isServersNode(
  node: AsyncApiTreeNode
): node is AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.SERVERS> {
  return node.kind === AsyncApiTreeNodeKinds.SERVERS;
}

export function isServerNode(
  node: AsyncApiTreeNode
): node is AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.SERVER> {
  return node.kind === AsyncApiTreeNodeKinds.SERVER;
}
