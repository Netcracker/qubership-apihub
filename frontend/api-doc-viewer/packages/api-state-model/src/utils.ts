import { graphApiNodeKind, graphSchemaNodeKind, IModelTreeNode } from '@netcracker/qubership-apihub-api-data-model'
import { isArgumentsNode, isOutputNode, isUsedDirectivesNode } from '../../api-doc-viewer/src/utils/nodes'
import { IModelStateNode, IModelStatePropNode } from './types'

export function isModelStatePropNode(node: IModelStateNode<any>): node is IModelStatePropNode<any> {
  return node.type === 'basic' || node.type === 'expandable'
}

export function isExpandableTreeNode(node: IModelTreeNode<any, any, any>): boolean {
  let children = node.expand().children()
  let nested = node.nested
  const usedDirectivesChild = children.find(isUsedDirectivesNode)
  const directiveUsages = usedDirectivesChild
    ? usedDirectivesChild
      .expand()
      .children()
      .filter(directiveUsage => directiveUsage.key !== 'deprecated')
    : []
  const argsChild = children.find(isArgumentsNode)
  const args = argsChild ? argsChild.expand().children() : []
  const outputChild = children.find(isOutputNode)
  if (outputChild) {
    children = outputChild.expand().children()
    nested = outputChild.nested
  }
  return directiveUsages.length > 0 || args.length > 0 || children.length > 0 || nested.length > 0
}

export const isGraphApiSchemaNode = (node: IModelTreeNode<unknown, string, unknown> | undefined): boolean => {
  if (!node) {
    return false
  }
  return [graphApiNodeKind.schema].some(kind => node.kind === kind)
}

export const isGraphApiOperationNode = (node: IModelTreeNode<unknown, string, unknown> | undefined): boolean => {
  if (!node) {
    return false
  }
  return [
    graphApiNodeKind.query,
    graphApiNodeKind.mutation,
    graphApiNodeKind.subscription
  ].some(kind => node.kind === kind)
}
