import { IModelTreeNode } from '@netcracker/qubership-apihub-api-data-model'
import { modelStateNodeType } from '../consts'
import { NodesChangesSummary } from '../../../api-doc-viewer/src/types/aliases/changes'

export type ModelStateNodeType = keyof typeof modelStateNodeType

export type IModelStateNode<T extends IModelTreeNode<any, any, any>> =
  | IModelStateCombinaryNode<T>
  | IModelStatePropNode<T>

export interface IModelStatePropNode<T extends IModelTreeNode<any, any, any>> {
  readonly type: Exclude<ModelStateNodeType, 'combinary'>
  readonly parent: IModelStatePropNode<T> | null
  readonly node: T

  // selected combinary item id (for nodes with combinary children)
  readonly selected: string | undefined

  // node.meta
  readonly meta: T['meta']
  // node.value(selected)
  readonly value: ReturnType<T['value']> | null
  // node.nestedNode(selected)
  readonly nestedNode: T | null
  // list of child state nodes
  readonly children: IModelStateNode<T>[]
  // if true - this is the first child of group (args/properties/items)
  readonly first: boolean
  // expanded state
  readonly expanded: boolean

  // all children nodes in flat list (including children of all levels)
  readonly allChildren: IModelStateNode<T>[]
  // all children count included children of all levels
  readonly allChildrenCount: number

  // sort child nodes
  readonly sorted: number

  sort(dir?: number): void

  expand(value?: number): void

  collapse(value?: number): void

  setSelected(id: string): void
}

export interface IModelStateCombinaryNode<T extends IModelTreeNode<any, any, any>> {
  readonly type: Exclude<ModelStateNodeType, 'basic' | 'expandable'>
  readonly parent: IModelStateNode<T> | null
  readonly node: T

  readonly nested: IModelTreeNode<any, any, any>[]
  readonly $nestedChangesSummary: NodesChangesSummary

  // selected combinary item id
  readonly selected: string | undefined

  select(id: string): void
}
