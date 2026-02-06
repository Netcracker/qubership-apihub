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

import { GraphApiTreeNode, graphSchemaNodeKind, IModelTreeNode } from '@netcracker/qubership-apihub-api-data-model'
import { isArgumentsNode, isOutputNode, isUsedDirectivesNode } from '../../../api-doc-viewer/src/utils/nodes'
import { JsonSchemaState, JsonSchemaStateCombinaryNode, JsonSchemaStatePropNode } from '../json-schema'
import { IModelStateCombinaryNode, IModelStateNode, IModelStatePropNode } from '../types'
import { BUILT_IN_DIRECTIVE_DEPRECATED } from '@netcracker/qubership-apihub-graphapi'

export class GraphSchemaStateCombinaryNode<T extends IModelTreeNode<any, any, any> = GraphApiTreeNode> extends JsonSchemaStateCombinaryNode<T> {
}

export class GraphSchemaStatePropNode<T extends IModelTreeNode<any, any, any> = GraphApiTreeNode> extends JsonSchemaStatePropNode<T> {
  private _argNodes: IModelStatePropNode<T>[] | undefined
  private _directiveUsageNodes: IModelStatePropNode<T>[] | undefined
  private _outputNodes: IModelStatePropNode<T>[] = []

  get args(): IModelStatePropNode<T>[] {
    if (!this._argNodes) {
      this.buildArgNodes(/*this._sort*/)
    }
    return this._argNodes ?? []
  }

  get output(): IModelStatePropNode<T>[] {
    return this._outputNodes
  }

  get value() {
    const outputChild = this.node.children().find(isOutputNode)
    if (outputChild) {
      // in this case output data has bigger priority
      const value = super.value
      const valueChanges = value?.$changes
      const outputValue = outputChild.value(this.selected) ?? {}
      const outputValueChanges = outputValue.$changes ?? {}
      return {
        ...value,
        ...outputValue,
        ...(valueChanges || outputValueChanges ? {
          $changes: {
            ...(valueChanges ?? {}),
            ...(outputValueChanges ?? {}),
          }
        } : {})
      }
    }
    return super.value
  }

  get meta() {
    const outputChild = this.node.children(this.selected).find(isOutputNode)
    if (outputChild) {
      // in this case output data has bigger priority
      const meta = super.meta ?? {}
      const { $nodeChange, $metaChanges, $childrenChanges, $nestedChanges } = meta
      const outputMeta = outputChild.meta ?? {}
      const {
        $nodeChange: outputNodeChange,
        $metaChanges: outputMetaChanges,
        $childrenChanges: outputChildrenChanges,
        $nestedChanges: outputNestedChanges
      } = outputMeta
      return {
        ...meta,
        ...outputMeta,
        ...($nodeChange || outputNodeChange ? {
          $nodeChange: { ...$nodeChange ?? {}, ...outputNodeChange ?? {} }
        } : {}),
        ...($metaChanges || outputMetaChanges ? {
          $metaChanges: { ...$metaChanges ?? {}, ...outputMetaChanges ?? {} }
        } : {}),
        ...($childrenChanges || outputChildrenChanges ? {
          $metaChanges: { ...$childrenChanges ?? {}, ...outputChildrenChanges ?? {} }
        } : {}),
        ...($nestedChanges || outputNestedChanges ? {
          $metaChanges: { ...$nestedChanges ?? {}, ...outputNestedChanges ?? {} }
        } : {}),
      }
    }
    return super.meta
  }

  public sort(sort = 0) {
    if (sort === this._sort) {
      return
    }
    this._sort = sort
    this._children = this.buildChildren()
  }

  public setSelected(value: string | undefined) {
    if (value !== this._selected) {
      this._selected = value
      this._children = this.buildChildren()
    }
  }

  private buildDirectiveUsageNodes(/*sort: number*/) {
    const children = this.node.expand().children()
    const usedDirectivesNode = children.find(isUsedDirectivesNode)
    const outputNode = children.find(child => child.kind === graphSchemaNodeKind.output)
    const usedDirectivesNodesFromOutput = outputNode
      ?.expand()
      ?.children()
      .filter(child => child.kind === graphSchemaNodeKind.usedDirectives)

    if (!usedDirectivesNode && !usedDirectivesNodesFromOutput) {
      return []
    }

    const nodes = (usedDirectivesNode?.expand().children() ?? []) as T[]
    const nodesFromOutput = (usedDirectivesNodesFromOutput ?? [])
      .flatMap(usedDirectives => usedDirectives.expand().children()) as T[]
    const allNodes = [...nodes, ...nodesFromOutput]
      .filter(directiveUsage => directiveUsage.key !== BUILT_IN_DIRECTIVE_DEPRECATED)
    // const sortedNodes = sort
    //   ? allNodes.sort((n1, n2) => (n1.key > n2.key ? -1 * sort : sort))
    //   : allNodes

    this._directiveUsageNodes = allNodes.length
      ? allNodes.map((node, i) => this.createStatePropNode(node, i === 0))
      : []
    return this._directiveUsageNodes
  }

  private buildArgNodes(/*sort: number*/) {
    const children = this.node.expand().children()
    const argsNode = children.find(isArgumentsNode)
    if (!argsNode) {
      return []
    }
    // convert nested args to children
    const argNodes = argsNode.expand().children() as T[] ?? []
    // const sortedArgNodes = sort
    //   ? argNodes.sort((n1, n2) => (n1.key > n2.key ? -1 * sort : sort))
    //   : argNodes
    this._argNodes = argNodes.length
      ? argNodes.map((arg, i) => this.createStatePropNode(arg, i === 0))
      : []
    return this._argNodes
  }

  protected buildCombinaryNodes() {
    let source: T | undefined
    if (this.node.nested.length) {
      source = this.node
    } else {
      const output = this.node.expand().children().find(isOutputNode)
      if (output?.nested.length) {
        source = output as T
      }
    }

    if (!source) {
      return []
    }

    const _combinary: IModelStateCombinaryNode<T>[] = []

    // convert nested to children
    for (let i = 0; source.nested.length > 0; i++) {
      const combinary: IModelStateCombinaryNode<T> = this._combinaryNodes[i] ?? this.createStateCombinaryNode(source)
      source = (source.nestedNode(combinary.selected) as T) ?? source.nested[0]
      _combinary.push(combinary)
    }

    this._combinaryNodes = _combinary
    return _combinary
  }

  protected buildChildrenNodes(/*sort: number*/): IModelStateNode<T>[] {
    const output = this.node.expand().children().find(isOutputNode)
    const children = (
      output ?
        [...output.expand().children(this.selected)] :
        [...this.node
          .expand()
          .children(this.selected)
          .filter(child => !isArgumentsNode(child))]
    ).filter(child => !isUsedDirectivesNode(child)) as T[]
    // const sortedChildren = sort
    //   ? children.sort((n1, n2) => (n1.key > n2.key ? -1 * sort : sort))
    //   : children
    this._childrenNodes = children.map((prop, i) => this.createStatePropNode(prop, i === 0))
    return this._childrenNodes
  }

  protected buildChildren(): IModelStateNode<T>[] {
    return [
      ...this.buildDirectiveUsageNodes(/*this._sort*/),
      ...this.buildArgNodes(/*this._sort*/),
      ...this.buildCombinaryNodes(),
      ...this.buildChildrenNodes(/*this._sort*/)
    ]
  }

  protected createStatePropNode(node: T, first = false): IModelStatePropNode<T> {
    return new GraphSchemaStatePropNode(node, this, first)
  }

  protected createStateCombinaryNode(node: T): IModelStateCombinaryNode<T> {
    return new GraphSchemaStateCombinaryNode(node, this, undefined)
  }
}

export class GraphSchemaState<T extends IModelTreeNode<any, any, any> = GraphApiTreeNode> extends JsonSchemaState<T> {
  protected createStatePropNode(node: T): IModelStatePropNode<T> {
    return new GraphSchemaStatePropNode(node, undefined, undefined)
  }
}
