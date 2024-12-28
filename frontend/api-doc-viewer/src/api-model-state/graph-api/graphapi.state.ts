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

import {
  GraphApiNodeData,
  graphApiNodeKind,
  GraphApiNodeKind,
  GraphApiNodeMeta,
  GraphApiTreeNode,
  graphSchemaNodeKind,
  IModelTree
} from '@netcracker/qubership-apihub-api-data-model'
import { modelStateNodeType } from '../consts'
import { GraphSchemaStateCombinaryNode, GraphSchemaStatePropNode } from '../graph-schema'
import { GraphOperationsFilter, IModelStateCombinaryNode, IModelStateNode, IModelStatePropNode } from '../types'
import { isGraphApiOperationNode, isGraphApiSchemaNode } from '../utils'

const GRAPH_API_KIND_PRIORITIES: Partial<Record<GraphApiNodeKind, number>> = {
  [graphApiNodeKind.query]: 2,
  [graphApiNodeKind.mutation]: 2,
  [graphApiNodeKind.subscription]: 2,
  [graphSchemaNodeKind.directive]: 1,
}

export class GraphApiStateCombinaryNode extends GraphSchemaStateCombinaryNode<GraphApiTreeNode> {
}

export class GraphApiStatePropNode extends GraphSchemaStatePropNode<GraphApiTreeNode> {

  constructor(
    node: GraphApiTreeNode,
    parent: IModelStatePropNode<GraphApiTreeNode> | null,
    first = false,
    private _filter?: GraphOperationsFilter,
  ) {
    super(node, parent, first)
    if (isGraphApiSchemaNode(node) || isGraphApiOperationNode(node)) {
      (this as any).type = modelStateNodeType.basic
      this.expanded = first
    }
  }

  protected buildChildrenNodes(): IModelStateNode<GraphApiTreeNode>[] {
    if (!isGraphApiSchemaNode(this.node)) {
      return super.buildChildrenNodes(this._sort)
    }

    const children = this.node
      .children(this.selected)
      .filter((child) => !this._filter || this._filter(child as GraphApiTreeNode))

    if (children.length === 0) {
      return []
    }

    let firstOperation: string | null = null
    let firstDirective: string | null = null

    return children
      .sort((a, b) => {
        const aKind = a.kind
        const bKind = b.kind
        const aPriority = GRAPH_API_KIND_PRIORITIES[aKind] ?? 0
        const bPriority = GRAPH_API_KIND_PRIORITIES[bKind] ?? 0
        return bPriority - aPriority
      })
      .map((prop, i) => {
        const { kind } = prop
        let first = false
        switch (kind) {
          case graphSchemaNodeKind.directive:
            // if first directive already found -> not first
            first = !firstDirective
            firstDirective = prop.id
            break
          case graphApiNodeKind.query:
          case graphApiNodeKind.mutation:
          case graphApiNodeKind.subscription:
            // if first operation already found -> not first
            first = !firstOperation
            firstOperation = prop.id
            break
          default:
            first = i === 0
        }
        return this.createStatePropNode(prop as GraphApiTreeNode, first)
      })
  }

  protected createStatePropNode(node: GraphApiTreeNode, first = false): IModelStatePropNode<GraphApiTreeNode> {
    return new GraphApiStatePropNode(node, this, first, this._filter)
  }

  protected createStateCombinaryNode(node: GraphApiTreeNode): IModelStateCombinaryNode<GraphApiTreeNode> {
    return new GraphApiStateCombinaryNode(node, this, undefined)
  }
}

export class GraphApiState {
  public readonly root: IModelStatePropNode<GraphApiTreeNode> | null

  constructor(
    tree: IModelTree<GraphApiNodeData, GraphApiNodeKind, GraphApiNodeMeta>,
    operationName?: string,
    expandDepth = 1,
  ) {
    const filter: GraphOperationsFilter = (node) => !isGraphApiOperationNode(node) || node.key === operationName

    this.root = tree.root
      ? new GraphApiStatePropNode(
        tree.root as GraphApiTreeNode,
        null,
        true,
        operationName ? filter : undefined
      )
      : null
    this.root?.expand(expandDepth)
  }
}
