/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
