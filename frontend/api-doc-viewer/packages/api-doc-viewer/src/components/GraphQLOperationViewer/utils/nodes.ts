import { graphApiNodeKind, graphSchemaNodeKind, IModelTreeNode } from '@netcracker/qubership-apihub-api-data-model'

// FIXME 14.11.23 // Extend basic method implementation

export function isOperationNode(node?: IModelTreeNode<any, any, any> | null): boolean {
  return (
    matchNodeKind(graphApiNodeKind.query, node) ||
    matchNodeKind(graphApiNodeKind.mutation, node) ||
    matchNodeKind(graphApiNodeKind.subscription, node)
  )
}

export function isPropertyNode(node?: IModelTreeNode<any, any, any> | null): boolean {
  return matchNodeKind(graphSchemaNodeKind.property, node)
}

export function matchNodeKind(kind: string, node?: IModelTreeNode<any, any, any> | null): boolean {
  return !!node && !!kind && node.kind === kind
}