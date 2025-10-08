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
  IModelTreeNode,
  JsonSchemaModelTree,
  JsonSchemaNode,
  JsonSchemaTreeNode,
  NodeChangesSummary
} from '@netcracker/qubership-apihub-api-data-model'
import { NodesChangesSummary } from '../../../api-doc-viewer/src/types/aliases/changes'
import { NodeId } from '../../../api-doc-viewer/src/types/aliases/nodes'
import { modelStateNodeType } from '../consts'
import { IModelStateCombinaryNode, IModelStateNode, IModelStatePropNode, ModelStateNodeType, } from '../types'
import { isModelStatePropNode } from '../utils'

export class JsonSchemaStateCombinaryNode<T extends IModelTreeNode<any, any, any> = JsonSchemaTreeNode>
  implements IModelStateCombinaryNode<T> {

  public readonly type = modelStateNodeType.combinary
  protected _selected: string | undefined
  private $nestedChangesSummaryValue?: NodesChangesSummary

  constructor(
    public readonly node: T,
    public readonly parent: IModelStatePropNode<T>,
    selected?: string,
  ) {
    this.node.nestedNode(selected)
  }

  get nested() {
    return this.node.nested
  }

  get selected() {
    if (!this._selected && this.node.nested.length) {
      return this.node.nested[0].id
    }
    return this._selected
  }

  get $nestedChangesSummary(): NodesChangesSummary {
    if (this.$nestedChangesSummaryValue) {
      return this.$nestedChangesSummaryValue
    }

    this.$nestedChangesSummaryValue = this.nested.reduce(
      (summary, nestedNode) => {
        const nestedId = nestedNode.id
        const nestedSummary = nestedNode.meta?.$nodeChangesSummary
        if (nestedId && nestedSummary) {
          summary[nestedId] = nestedSummary
        }
        return summary
      },
      {} as Record<NodeId, NodeChangesSummary>
    )
    return this.$nestedChangesSummaryValue
  }

  public select(id: string) {
    if (id === this.selected) {
      return
    }
    this._selected = id
    this.parent.setSelected(id)
  }
}

export class JsonSchemaStatePropNode<T extends IModelTreeNode<any, any, any> = JsonSchemaTreeNode>
  implements IModelStatePropNode<T> {

  protected _combinaryNodes: IModelStateCombinaryNode<T>[] = []
  protected _childrenNodes: IModelStatePropNode<T>[] = []

  protected _expanded = false
  protected _selected: string | undefined
  protected _children: IModelStateNode<T>[] | null = null
  protected _sort = 0

  public readonly type: Exclude<ModelStateNodeType, 'combinary'>

  constructor(
    public readonly node: T,
    public readonly parent: IModelStatePropNode<T> | null = null,
    public first = false,
  ) {
    // this.type = isExpandableTreeNode(node)
    //   ? modelStateNodeType.expandable
    //   : modelStateNodeType.basic
    this.type = modelStateNodeType.expandable
  }

  get sorted(): number {
    return this._sort
  }

  get expanded() {
    return this._expanded
  }

  set expanded(value: boolean) {
    if (value !== this._expanded) {
      this._expanded = value
      if (this._children === null) {
        this._children = this.buildChildren()
      }
    }
  }

  get children(): IModelStateNode<T>[] {
    return this.expanded && this._children ? this._children : []
  }

  get allChildrenCount(): number {
    return (
      this._children?.reduce(
        (res, curr) => res + (isModelStatePropNode(curr) ? curr.allChildrenCount : 0),
        this._children.length
      ) ?? 0
    )
  }

  get allChildren(): IModelStateNode<T>[] {
    const _children = []

    for (const child of this.children) {
      _children.push(child, ...(isModelStatePropNode(child) ? child.allChildren : []))
    }

    return _children
  }

  public expand(value = 1) {
    this.expanded = !!value

    if (value > 1 && !('isCycle' in this.node && this.node.isCycle)) {
      this.children.forEach((child) => isModelStatePropNode(child) && child.expand(value - 1))
    }
  }

  public collapse(value = 1) {
    if (value > 1) {
      this.children.forEach((child) => isModelStatePropNode(child) && child.collapse(value - 1))
    }

    this.expanded = !value
  }

  get selected() {
    return this._selected
  }

  public setSelected(value: string | undefined) {
    if (value !== this._selected) {
      this._selected = value
      this._children = [...this.buildCombinaryNodes(), ...this.buildChildrenNodes(this._sort)]
    }
  }

  get value() {
    return this.node.value(this.selected)
  }

  get meta() {
    return this.node.meta
  }

  get nestedNode(): T | null {
    return this.node.nestedNode(this.selected) as T
  }

  public sort(sort = 0) {
    if (sort === this._sort) { return }
    this._sort = sort
    this._children = [...this._combinaryNodes, ...this.buildChildrenNodes(sort)]
  }

  protected buildCombinaryNodes() {
    if (!this.node.nested.length) {
      return []
    }
    const _combinary: IModelStateCombinaryNode<T>[] = []

    // convert nested to children
    let node = this.node
    for (let i = 0; node.nested.length > 0; i++) {
      const combinary = this._combinaryNodes[i] ?? this.createStateCombinaryNode(node)
      node = (node.nestedNode(combinary.selected) as T) ?? node.nested[0]
      _combinary.push(combinary)
    }

    this._combinaryNodes = _combinary
    return _combinary
  }

  protected buildChildrenNodes(sort: number): IModelStateNode<T>[] {
    const children = [...this.node.expand().children(this.selected)] as T[]
    const sorted = sort
      ? children.sort((n1, n2) => (n1.key > n2.key ? -1 * sort : sort))
      : children
    this._childrenNodes = sorted.length
      ? sorted.map((prop, i) => this.createStatePropNode(prop, i === 0))
      : []
    return this._childrenNodes
  }

  protected buildChildren(): IModelStateNode<T>[] {
    return [...this.buildCombinaryNodes(), ...this.buildChildrenNodes(this._sort)]
  }

  protected createStatePropNode(node: T, first = false): IModelStatePropNode<T> {
    return new JsonSchemaStatePropNode(node, this, first)
  }

  protected createStateCombinaryNode(node: T): IModelStateCombinaryNode<T> {
    return new JsonSchemaStateCombinaryNode(node, this, undefined)
  }
}

export class JsonSchemaState<T extends IModelTreeNode<any, any, any> = JsonSchemaNode> {
  public readonly root: IModelStatePropNode<T> | null

  protected createStatePropNode(node: T): IModelStatePropNode<T> {
    return new JsonSchemaStatePropNode(node, undefined, undefined)
  }

  constructor(
    public tree: JsonSchemaModelTree<ReturnType<T['value']>, T['kind'], T['meta']>,
    expandDepth = 1,
  ) {
    this.root = tree.root ? this.createStatePropNode(tree.root as T) : null
    this.root?.expand(expandDepth)
  }

  public modelStateNodes(): IModelStateNode<T>[] {
    if (!this.root) {
      return []
    }

    return [this.root, ...this.root.allChildren]
  }
}
