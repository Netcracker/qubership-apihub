import { ComplexTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/complex-node.impl";
import { SimpleTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/simple-node.impl";
import { AsyncApiTreeNode, AsyncApiTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/aliases";
import { AsyncApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-kind";

/**
 * Generic type guard that narrows a tree node to its "with diffs" representation.
 *
 * A "with diffs" node is an instance of one of the abstract tree-with-diffs node classes
 * (e.g. `SimpleTreeNodeWithDiffs` / `ComplexTreeNodeWithDiffs`). The concrete class is supplied
 * via `withDiffsConstructor` so that this utility stays free of any imports and can be reused for
 * any API Type. The expected narrowed type is provided through the generic type argument `T`.
 *
 * @param node node to test (may be `null`/`undefined`)
 * @param withDiffsConstructor class whose instances represent a "with diffs" node
 * @param kind optional node kind (or list of kinds) that `node.kind` must match before the instance check
 */
export function isTreeNodeWithDiffs<T extends { kind: PropertyKey }>(
  node: { kind: PropertyKey } | null | undefined,
  withDiffsConstructor: abstract new (...args: never[]) => object,
  kind?: PropertyKey | PropertyKey[],
): node is T {
  return (
    !!node &&
    (kind === undefined || (Array.isArray(kind) ? kind.includes(node.kind) : node.kind === kind)) &&
    node instanceof withDiffsConstructor
  )
}

export function isBindingsNodeWithDiffs(
  node:
    | AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.BINDINGS>
    | AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.BINDINGS>
): node is AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.BINDINGS> {
  return isTreeNodeWithDiffs<AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.BINDINGS>>(node, ComplexTreeNodeWithDiffs, AsyncApiTreeNodeKinds.BINDINGS);
}

export function isBindingNodeWithDiffs(
  node:
    | AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.BINDING>
    | AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.BINDING>
): node is AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.BINDING> {
  return isTreeNodeWithDiffs<AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.BINDING>>(node, SimpleTreeNodeWithDiffs, AsyncApiTreeNodeKinds.BINDING);
}

export function isExtensionsNodeWithDiffs(
  node:
    | AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.EXTENSIONS>
    | AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.EXTENSIONS>
): node is AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.EXTENSIONS> {
  return isTreeNodeWithDiffs<AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.EXTENSIONS>>(node, SimpleTreeNodeWithDiffs)
}

export function isMessageChannelNodeWithDiffs(
  node:
    | AsyncApiTreeNode
    | AsyncApiTreeNodeWithDiffs
): node is AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL> {
  return isTreeNodeWithDiffs<AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL>>(node, SimpleTreeNodeWithDiffs, AsyncApiTreeNodeKinds.MESSAGE_CHANNEL)
}

export function isMessageChannelParametersNodeWithDiffs(
  node:
    | AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS>
    | AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS>
): node is AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS> {
  return isTreeNodeWithDiffs<AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS>>(node, SimpleTreeNodeWithDiffs)
}

export function isServerNodeWithDiffs(
  node:
    | AsyncApiTreeNode
    | AsyncApiTreeNodeWithDiffs
): node is AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.SERVER> {
  return isTreeNodeWithDiffs<AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.SERVER>>(node, SimpleTreeNodeWithDiffs, AsyncApiTreeNodeKinds.SERVER)
}

export function isServersNodeWithDiffs(
  node:
    | AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.SERVERS>
    | AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.SERVERS>
): node is AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.SERVERS> {
  return isTreeNodeWithDiffs<AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.SERVERS>>(node, SimpleTreeNodeWithDiffs);
}

export function isAsyncApiMessageHeadersNodeWithDiffs(
  node:
    | AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.MESSAGE_HEADERS>
    | AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.MESSAGE_HEADERS>
    | undefined
): node is AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.MESSAGE_HEADERS> {
  return isTreeNodeWithDiffs<AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.MESSAGE_HEADERS>>(node, SimpleTreeNodeWithDiffs, AsyncApiTreeNodeKinds.MESSAGE_HEADERS)
}

export function isAsyncApiMessagePayloadNodeWithDiffs(
  node:
    | AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD>
    | AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD>
    | undefined
): node is AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD> {
  return isTreeNodeWithDiffs<AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD>>(node, SimpleTreeNodeWithDiffs, AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD)
}

export function isMessageNodeWithDiffs(
  node:
    | AsyncApiTreeNode
    | AsyncApiTreeNodeWithDiffs
): node is AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.MESSAGE> {
  return isTreeNodeWithDiffs<AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.MESSAGE>>(node, SimpleTreeNodeWithDiffs, AsyncApiTreeNodeKinds.MESSAGE);
}

export function isMessageOperationNodeWithDiffs(
  node:
    | AsyncApiTreeNode
    | AsyncApiTreeNodeWithDiffs
): node is AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.MESSAGE_OPERATION> {
  return isTreeNodeWithDiffs<AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.MESSAGE_OPERATION>>(node, SimpleTreeNodeWithDiffs, AsyncApiTreeNodeKinds.MESSAGE_OPERATION)
}

export function isMessageSectionSelectorNodeWithDiffs(
  node:
    | AsyncApiTreeNode
    | AsyncApiTreeNodeWithDiffs
): node is AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR> {
  return isTreeNodeWithDiffs<AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR>>(node, SimpleTreeNodeWithDiffs, AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR)
}

export function isMessageSectionNodeWithDiffs(
  node:
    | AsyncApiTreeNode
    | AsyncApiTreeNodeWithDiffs
): node is AsyncApiTreeNodeWithDiffs<
  | typeof AsyncApiTreeNodeKinds.MESSAGE_CONTENT
  | typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL
  | typeof AsyncApiTreeNodeKinds.MESSAGE_OPERATION
> {
  return isTreeNodeWithDiffs<AsyncApiTreeNodeWithDiffs<
    | typeof AsyncApiTreeNodeKinds.MESSAGE_CONTENT
    | typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL
    | typeof AsyncApiTreeNodeKinds.MESSAGE_OPERATION
  >>(node, SimpleTreeNodeWithDiffs, [
    AsyncApiTreeNodeKinds.MESSAGE_CONTENT,
    AsyncApiTreeNodeKinds.MESSAGE_CHANNEL,
    AsyncApiTreeNodeKinds.MESSAGE_OPERATION,
  ])
}
