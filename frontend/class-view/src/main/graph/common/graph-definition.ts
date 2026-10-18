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

import { Optional } from 'main/domain/base'

export interface GraphMeta {
  readonly key: unknown;
  readonly graph: IGraph<this>;
  readonly node: unknown;
  readonly edge: unknown;
  readonly port: unknown;
  readonly label: unknown;
}

export type GraphItem<Meta extends GraphMeta> = Meta['node'] | Meta['edge'] | Meta['port'] | Meta['label']
export type ConnectableGraphItem<Meta extends GraphMeta> = Meta['node'] | Meta['port']
export type LabelOwnerGraphItem<Meta extends GraphMeta> = Meta['node'] | Meta['edge'] | Meta['port']

export interface ItemReducer<Meta extends GraphMeta, Result> {
  node?(node: Meta['node'], accumulator: Result): Result

  edge?(edge: Meta['edge'], accumulator: Result): Result

  port?(port: Meta['port'], accumulator: Result): Result

  label?(label: Meta['label'], accumulator: Result): Result
}

export interface IGraph<Meta extends GraphMeta> {
  createNode(key: Meta['key'], userObject: unknown): Meta['node']

  updateNode(node: Meta['node'], newUserObject: unknown): Meta['node']

  removeNode(node: Meta['node']): void

  createEdge(key: Meta['key'], source: ConnectableGraphItem<Meta>, target: ConnectableGraphItem<Meta>, userObject: unknown): Meta['edge']

  updateEdge(edge: Meta['edge'], source: ConnectableGraphItem<Meta>, target: ConnectableGraphItem<Meta>, newUserObject: unknown): Meta['edge']

  removeEdge(edge: Meta['edge']): void

  createPort(key: Meta['key'], owner: Meta['node'], userObject: unknown): Meta['port']

  updatePort(port: Meta['port'], owner: Meta['node'], newUserObject: unknown): Meta['port']

  removePort(port: Meta['port']): void

  createLabel(key: Meta['key'], owner: LabelOwnerGraphItem<Meta>, labelText: string, userObject: unknown): Meta['label']

  updateLabel(label: Meta['label'], owner: LabelOwnerGraphItem<Meta>, labelText: string, newUserObject: unknown): Meta['label']

  removeLabel(label: Meta['label']): void

  readonly nodes: Meta['node'][]

  readonly edges: Meta['edge'][]

  getGraphItemLabels(node: LabelOwnerGraphItem<Meta>): Meta['label'][]

  getNodePorts(node: Meta['node']): Meta['port'][]

  getLabelOwner(label: Meta['label']): LabelOwnerGraphItem<Meta>

  getPortOwner(port: Meta['port']): Meta['node']

  isNode(item: GraphItem<Meta>): item is Meta['node'];

  isEdge(item: GraphItem<Meta>): item is Meta['edge'];

  isPort(item: GraphItem<Meta>): item is Meta['port'];

  isLabel(item: GraphItem<Meta>): item is Meta['label'];

  getEdgeSource(edge: Meta['edge']): ConnectableGraphItem<Meta>

  getEdgeTarget(edge: Meta['edge']): ConnectableGraphItem<Meta>

  getEdgeEndPoints(edge: Meta['edge']): [ConnectableGraphItem<Meta>, ConnectableGraphItem<Meta>]

  reduceGraphItems<Result>(items: GraphItem<Meta>[], reducer: ItemReducer<Meta, Result>, initial: Result): Result
}

export interface GraphMerger<Meta extends GraphMeta> {
  createEditSession(source: Meta['graph'] | MergeResult<Meta>): GraphMergerSession<Meta>
}

export interface ModificationAppliers<Graph, Item, UserObject> {
  readonly createApplier?: Optional<CreateApplier<Graph, Item, UserObject>>,
  readonly updateApplier?: Optional<UpdateApplier<Graph, Item, UserObject>>,
  readonly removeApplier?: Optional<RemoveApplier<Graph, Item, UserObject>>
}

export interface GraphMergerSession<Meta extends GraphMeta> {

  node<UserObject, Node extends Meta['node']>(
    userObject: UserObject,
    key: Meta['key'],
    modificationAppliers?: Optional<ModificationAppliers<Meta['graph'], Node, UserObject>>,
  ): void

  port<UserObject, Port extends Meta['port']>(
    userObject: UserObject,
    key: Meta['key'],
    ownerKey: Meta['key'],
    modificationAppliers?: Optional<ModificationAppliers<Meta['graph'], Port, UserObject>>,
  ): void

  edge<UserObject, Edge extends Meta['edge']>(
    userObject: UserObject,
    key: Meta['key'],
    sourceKey: Meta['key'],
    targetKey: Meta['key'],
    modificationAppliers?: Optional<ModificationAppliers<Meta['graph'], Edge, UserObject>>,
  ): void

  label<UserObject, Label extends Meta['label']>(
    userObject: UserObject,
    key: Meta['key'],
    ownerKey: Meta['key'],
    labelText: string,
    modificationAppliers?: Optional<ModificationAppliers<Meta['graph'], Label, UserObject>>,
  ): void

  commit(): MergeResult<Meta>

}

export interface MergeResult<Meta extends GraphMeta> {
  resolveItem(key: Meta['key']): Optional<GraphItem<Meta>>
}

export type CreateApplier<Graph, Item, UserObject> = (
  graph: Graph,
  item: Item,
  userObject: UserObject,
) => void

export type RemoveApplier<Graph, Item, UserObject> = (
  graph: Graph,
  item: Item,
  userObject: UserObject,
) => void

export type UpdateApplier<Graph, Item, UserObject> = (
  graph: Graph,
  item: Item,
  newUserObject: UserObject,
  oldUserObject: UserObject,
) => void

export function compositeModificationAppliers<Graph, Item, UserObject>(...appliers: ModificationAppliers<Graph, Item, UserObject>[]): ModificationAppliers<Graph, Item, UserObject> {
  return {
    createApplier: (graph, item, userObject) => appliers.forEach(value => value.createApplier?.(graph, item, userObject)),
    updateApplier: (graph, item, newUserObject, oldUserObject) => appliers.forEach(value => value.updateApplier?.(graph, item, newUserObject, oldUserObject)),
    removeApplier: (graph, item, userObject) => appliers.forEach(value => value.removeApplier?.(graph, item, userObject)),
  }
}
