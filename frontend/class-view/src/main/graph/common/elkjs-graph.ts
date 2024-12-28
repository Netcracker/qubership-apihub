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

import { ELK, ElkExtendedEdge, ElkLabel, ElkNode, ElkPort, LayoutOptions } from 'elkjs'
import { OneLineText, Pixel, Point, Size, UnwrapArray } from 'main/domain/base'
import {
  EdgePath,
  GraphItemKey,
  LayoutGraph,
  LayoutGraphMeta,
  LocatableEdge,
  LocatableLabel,
  LocatableNode,
  LocatablePort,
} from 'main/graph/common/layout-graph-definition'
import { ListMultimap } from 'main/core/list-multimap'
import { ConnectableGraphItem, GraphItem, ItemReducer, LabelOwnerGraphItem } from 'main/graph/common/graph-definition'
import { isDefine } from 'main/core/utils'

interface ElkJsGraphMetaImpl extends LayoutGraphMeta {
  readonly graph: ElkJsGraphImpl<this>;
  readonly node: ElkJsNodeImpl<unknown>;
  readonly edge: ElkJsEdgeImpl<this, unknown>;
  readonly port: ElkJsPortImpl<this, unknown>;
  readonly label: ElkJsLabelImpl<this, unknown>;
}

abstract class AbstractElkJsItem<UserObject> {
  mutableUserObject: UserObject

  protected constructor(mutableUserObject: UserObject) {
    this.mutableUserObject = mutableUserObject
  }

  get userObject(): UserObject {
    return this.mutableUserObject
  }
}

class ElkJsNodeImpl<UserObject> extends AbstractElkJsItem<UserObject> implements LocatableNode<UserObject> {
  readonly mutableElement: ElkNode

  constructor(private readonly _container: ElkNode, key: GraphItemKey, userObject: UserObject) {
    super(userObject)
    addToOptionalArray(_container, 'children', this.mutableElement = {
      id: key,
    })
  }

  get id(): GraphItemKey {
    return this.mutableElement.id
  }

  get selfCenterRelativeToParentNodeCenter(): Point<Pixel> {
    return {
      x: (this.mutableElement.x || 0) + (this.mutableElement.width || 0) / 2.0,
      y: (this.mutableElement.y || 0) + (this.mutableElement.height || 0) / 2.0,
    }
  }

  set selfCenterRelativeToParentNodeCenter(value: Point<Pixel>) {
    this.mutableElement.x = value.x
    this.mutableElement.y = value.y
  }

  get size(): Size<Pixel> {
    return {
      width: this.mutableElement.width || 0,
      height: this.mutableElement.height || 0,
    }
  }

  set size(value: Size<Pixel>) {
    this.mutableElement.width = value.width
    this.mutableElement.height = value.height
  }

  removeFromContainer() {
    removeFromOptionalArray(this._container, 'children', this.mutableElement)
  }

  cleanupLayoutData(): void {
  }
}

class ElkJsEdgeImpl<Meta extends ElkJsGraphMetaImpl, UserObject> extends AbstractElkJsItem<UserObject> implements LocatableEdge<UserObject> {
  readonly mutableElement: ElkExtendedEdge

  constructor(
    private readonly _container: ElkNode,
    key: GraphItemKey,
    userObject: UserObject,
    private readonly _source: ConnectableGraphItem<Meta>,
    private readonly _target: ConnectableGraphItem<Meta>) {
    super(userObject)
    addToOptionalArray(this._container, 'edges', this.mutableElement = {
      id: key,
      sources: [_source.mutableElement.id],
      targets: [_target.mutableElement.id],
    })
  }

  get id(): GraphItemKey {
    return this.mutableElement.id
  }

  get source(): ConnectableGraphItem<Meta> {
    return this._source
  }

  get target(): ConnectableGraphItem<Meta> {
    return this._target
  }

  get selfPathRelativeToParentNodeCenter(): EdgePath {
    const sections = this.mutableElement.sections || []
    return sections.reduce((collector, section) => {
      collector.push.apply(collector, [section.startPoint, ...section.bendPoints || [], section.endPoint])
      return collector
    }, [] as EdgePath)
  }

  removeFromContainer() {
    removeFromOptionalArray(this._container, 'edges', this.mutableElement)
  }

  changeEndPoints(source: ConnectableGraphItem<Meta>, target: ConnectableGraphItem<Meta>) {
    this.mutableElement.sources = [source.mutableElement.id]
    this.mutableElement.targets = [target.mutableElement.id]
  }

  cleanupLayoutData(): void {
    delete this.mutableElement.junctionPoints
    delete this.mutableElement.sections
  }
}

class ElkJsPortImpl<Meta extends ElkJsGraphMetaImpl, UserObject> extends AbstractElkJsItem<UserObject> implements LocatablePort<UserObject> {
  readonly mutableElement: ElkPort

  constructor(
    private readonly _owner: Meta['node'],
    key: GraphItemKey,
    userObject: UserObject,
  ) {
    super(userObject)
    addToOptionalArray(_owner.mutableElement, 'ports', this.mutableElement = {
      id: key,
    })
  }

  get id(): GraphItemKey {
    return this.mutableElement.id
  }

  get selfCenterRelativeToNodeCenter(): Point<Pixel> {
    const parentSize = this._owner.size
    return {
      x: (this.mutableElement.x || 0) - parentSize.width / 2.0 + (this.mutableElement.width || 0) / 2.0,
      y: (this.mutableElement.y || 0) - parentSize.height / 2.0 + (this.mutableElement.height || 0) / 2.0,
    }
  }

  set selfCenterRelativeToNodeCenter(value: Point<Pixel>) {
    const parentSize = this._owner.size
    this.mutableElement.x = parentSize.width / 2.0 + value.x - (this.mutableElement.width || 0) / 2.0
    this.mutableElement.y = parentSize.height / 2.0 + value.y - (this.mutableElement.height || 0) / 2.0
    mergeLayoutOptions(this._owner.mutableElement, 'org.eclipse.elk.portConstraints', 'FIXED_POS')
    // mergeLayoutOptions(this.mutableElement, 'org.eclipse.elk.port.borderOffset', '2.5') todo when x or y === 0 then ELKJS ignore it :(
  }

  get size(): Size<Pixel> {
    return {
      width: this.mutableElement.width || 0,
      height: this.mutableElement.height || 0,
    }
  }

  set size(value: Size<Pixel>) {
    //todo maybe we should take into account center location to change size with save center location
    this.mutableElement.width = value.width
    this.mutableElement.height = value.height
  }

  removeFromOwner() {
    removeFromOptionalArray(this._owner.mutableElement, 'ports', this.mutableElement)
  }

  get owner(): Meta['node'] {
    return this._owner
  }

  set owner(owner: Meta['node']) {
    if (owner !== this._owner) {
      throw new Error('Not implemented owner change')
    }
  }

  cleanupLayoutData(): void {

  }
}

class ElkJsLabelImpl<Meta extends ElkJsGraphMetaImpl, UserObject> extends AbstractElkJsItem<UserObject> implements LocatableLabel<UserObject> {
  readonly mutableElement: ElkLabel

  constructor(
    private readonly _owner: LabelOwnerGraphItem<Meta>,
    key: GraphItemKey,
    userObject: UserObject,
  ) {
    super(userObject)
    addToOptionalArray(_owner.mutableElement, 'labels', this.mutableElement = {
      id: key,
    })
  }

  get id(): GraphItemKey {
    return this.mutableElement.id!
  }

  removeFromOwner() {
    removeFromOptionalArray(this._owner.mutableElement, 'labels', this.mutableElement)
  }

  get labelText(): OneLineText {
    return this.mutableElement.text || ''
  }

  set labelText(val: OneLineText) {
    this.mutableElement.text = val
  }

  get selfCenterRelativeToNodeCenter(): Point<Pixel> {
    if (!(this._owner instanceof ElkJsNodeImpl)) {
      throw new Error('This label not under the node')
    }
    const parentSize = this._owner.size
    return {
      x: (this.mutableElement.x || 0) - parentSize.width / 2.0 + (this.mutableElement.width || 0) / 2.0,
      y: (this.mutableElement.y || 0) - parentSize.height / 2.0 + (this.mutableElement.height || 0) / 2.0,
    }
  }

  set selfCenterRelativeToNodeCenter(value: Point<Pixel>) {
    if (!(this._owner instanceof ElkJsNodeImpl)) {
      throw new Error('This label not under the node')
    }
    const parentSize = this._owner.size
    this.mutableElement.x = parentSize.width / 2.0 + value.x - (this.mutableElement.width || 0) / 2.0
    this.mutableElement.y = parentSize.height / 2.0 + value.y - (this.mutableElement.height || 0) / 2.0
  }

  get size(): Size<Pixel> {
    return {
      width: this.mutableElement.width || 0,
      height: this.mutableElement.height || 0,
    }
  }

  set size(value: Size<Pixel>) {
    //todo maybe we should take into account center location to change size with save center location
    this.mutableElement.width = value.width
    this.mutableElement.height = value.height
  }

  get owner(): LabelOwnerGraphItem<Meta> {
    return this._owner
  }

  set owner(owner: LabelOwnerGraphItem<Meta>) {
    if (owner !== this._owner) {
      throw new Error('Not implemented owner change')
    }
  }

  cleanupLayoutData(): void {

  }
}

export function createLayoutGraph<Meta extends LayoutGraphMeta>(elk: ELK): LayoutGraph<Meta> {
  return new ElkJsGraphImpl<ElkJsGraphMetaImpl & Meta>(elk)
}

class ElkJsGraphImpl<Meta extends ElkJsGraphMetaImpl> implements LayoutGraph<Meta> {

  private readonly _root: ElkNode //just for split with layout. do not use it for any other cases

  private readonly _nodes: Meta['node'][]
  private readonly _edges: Meta['edge'][]
  private readonly _ownerLabels: ListMultimap<LabelOwnerGraphItem<Meta>, Meta['label']>
  private readonly _ownerPorts: ListMultimap<Meta['node'], Meta['port']>

  constructor(private readonly _elk: ELK) {
    this._root = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.spacing.edgeEdge': '20',
        'elk.spacing.edgeNode': '20',
        'elk.layered.spacing.edgeEdgeBetweenLayers': '20',
        'elk.layered.spacing.edgeNodeBetweenLayers': '20',
        'elk.spacing.nodeNode': '40',
        'elk.layered.spacing.nodeNodeBetweenLayers': '40',
        'elk.spacing.nodeSelfLoop': '20',
      },
    }
    this._nodes = []
    this._edges = []
    this._ownerLabels = new ListMultimap()
    this._ownerPorts = new ListMultimap()
  }

  dump(): void {
    console.info(JSON.stringify(this._root))
  }

  async doLayout(): Promise<void> {
    [
      ...this._nodes,
      ...this._edges,
      ...this._ownerLabels.values(),
      ...this._ownerPorts.values(),

    ].forEach(node => node.cleanupLayoutData())
    await this._elk.layout(this._root, { logging: true, measureExecutionTime: true })
  }

  createNode<UserObject>(key: GraphItemKey, userData: UserObject): Meta['node'] {
    const impl = new ElkJsNodeImpl(this._root, key, userData)
    this._nodes.push(impl)
    return impl
  }

  createEdge<UserObject>(key: GraphItemKey, source: ConnectableGraphItem<Meta>, target: ConnectableGraphItem<Meta>, userObject: UserObject): Meta['edge'] {
    const impl = new ElkJsEdgeImpl(this._root, key, userObject, source, target)
    this._edges.push(impl)
    return impl
  }

  createPort<UserObject>(key: GraphItemKey, owner: Meta['node'], userObject: UserObject): Meta['port'] {
    const impl = new ElkJsPortImpl(owner, key, userObject)
    this._ownerPorts.set(owner, impl)
    return impl
  }

  createLabel<UserObject>(key: GraphItemKey, owner: LabelOwnerGraphItem<Meta>, labelText: string, userObject: UserObject): Meta['label'] {
    const impl = new ElkJsLabelImpl(owner, key, userObject)
    impl.labelText = labelText
    this._ownerLabels.set(owner, impl)
    return impl
  }

  removeEdge(edge: Meta['edge']): void {
    const index = this._edges.indexOf(edge)
    if (index < 0) {
      throw new Error(`Edge ${edge.id} not from this graph`)
    }
    this._edges.splice(index, 1)
    this._ownerLabels.deleteAllByKey(edge)
    edge.removeFromContainer()
  }

  removeLabel(label: Meta['label']): void {
    this._ownerLabels.delete(label.owner, label)
    label.removeFromOwner()
  }

  removeNode(node: Meta['node']): void {
    const index = this._nodes.indexOf(node)
    if (index < 0) {
      throw new Error(`Node ${node.id} not from this graph`)
    }
    this._nodes.splice(index, 1)
    this._ownerLabels.deleteAllByKey(node)
    this._ownerPorts.deleteAllByKey(node)
    node.removeFromContainer()
  }

  removePort(port: Meta['port']): void {
    this._ownerLabels.deleteAllByKey(port)
    this._ownerPorts.delete(port.owner, port)
    port.removeFromOwner()
  }

  updateEdge<UserObject>(edge: Meta['edge'], source: ConnectableGraphItem<Meta>, target: ConnectableGraphItem<Meta>, newUserData: UserObject): Meta['edge'] {
    edge.changeEndPoints(source, target)
    edge.mutableUserObject = newUserData
    return edge
  }

  updateLabel<UserObject>(label: Meta['label'], owner: LabelOwnerGraphItem<Meta>, labelText: string, newUserData: UserObject): Meta['label'] {
    const oldOwner = label.owner
    label.owner = owner
    label.labelText = labelText
    label.mutableUserObject = newUserData
    if (oldOwner !== owner) {
      this._ownerLabels.delete(oldOwner, label)
      this._ownerLabels.set(owner, label)
    }
    return label
  }

  updateNode<UserObject>(node: Meta['node'], newUserData: UserObject): Meta['node'] {
    node.mutableUserObject = newUserData
    return node
  }

  updatePort<UserObject>(port: Meta['port'], owner: Meta['node'], newUserData: UserObject): Meta['port'] {
    const oldOwner = port.owner
    port.owner = owner
    port.mutableUserObject = newUserData
    if (oldOwner !== owner) {
      this._ownerPorts.delete(oldOwner, port)
      this._ownerPorts.set(owner, port)
    }
    return port
  }

  getNodeSize(node: Meta['node']): Size<Pixel> {
    return node.size
  }

  setNodeSize(node: Meta['node'], size: Size<Pixel>): void {
    node.size = size
  }

  getNodeCenterRelativeToParentNodeCenter(node: Meta['node']): Point<Pixel> {
    return node.selfCenterRelativeToParentNodeCenter
  }

  setNodeCenterRelativeToParentNodeCenter(node: Meta['node'], center: Point<Pixel>): void {
    node.selfCenterRelativeToParentNodeCenter = center
  }

  getAbsoluteNodeCenter(node: Meta['node']): Point<Pixel> {
    //todo temp. Cause no parents
    return node.selfCenterRelativeToParentNodeCenter
  }

  getEdgePathRelativeToParentNodeCenter(edge: Meta['edge']): EdgePath {
    return edge.selfPathRelativeToParentNodeCenter
  }

  getAbsoluteEdgePath(edge: Meta['edge']): EdgePath {
    //todo temp. Cause no parents
    return edge.selfPathRelativeToParentNodeCenter
  }

  getLabelSize(label: Meta['label']): Size<Pixel> {
    return label.size
  }

  setLabelSize(label: Meta['label'], size: Size<Pixel>): void {
    label.size = size
  }

  getLabelText(label: Meta['label']): OneLineText {
    return label.labelText
  }

  setLabelText(label: Meta['label'], text: OneLineText): void {
    label.labelText = text
  }

  getLabelCenterRelativeToNodeCenter(label: Meta['label']): Point<Pixel> {
    return label.selfCenterRelativeToNodeCenter
  }

  setLabelCenterRelativeToNodeCenter(label: Meta['label'], center: Point<Pixel>): void {
    label.selfCenterRelativeToNodeCenter = center
  }

  getAbsoluteLabelCenter(label: Meta['label']): Point<Pixel> {
    const labelOwner = this.getLabelOwner(label)
    if (this.isNode(labelOwner)) {
      const absoluteNodeCenter = this.getAbsoluteNodeCenter(labelOwner)
      const portCenterRelativeToNodeCenter = this.getLabelCenterRelativeToNodeCenter(label)
      return {
        x: absoluteNodeCenter.x + portCenterRelativeToNodeCenter.x,
        y: absoluteNodeCenter.y + portCenterRelativeToNodeCenter.y,
      }
    } else {
      throw new Error('Not implemented')
    }
  }

  getPortSize(port: Meta['port']): Size<Pixel> {
    return port.size
  }

  setPortSize(port: Meta['port'], size: Size<Pixel>): void {
    port.size = size
  }

  getPortCenterRelativeToNodeCenter(port: Meta['port']): Point<Pixel> {
    return port.selfCenterRelativeToNodeCenter
  }

  setPortCenterRelativeToNodeCenter(port: Meta['port'], center: Point<Pixel>): void {
    port.selfCenterRelativeToNodeCenter = center
  }

  getAbsolutePortCenter(port: Meta['port']): Point<Pixel> {
    const absoluteNodeCenter = this.getAbsoluteNodeCenter(this.getPortOwner(port))
    const portCenterRelativeToNodeCenter = this.getPortCenterRelativeToNodeCenter(port)
    return {
      x: absoluteNodeCenter.x + portCenterRelativeToNodeCenter.x,
      y: absoluteNodeCenter.y + portCenterRelativeToNodeCenter.y,
    }
  }

  get nodes(): Meta['node'][] {
    return [...this._nodes]
  }

  get edges(): Meta['edge'][] {
    return [...this._edges]
  }

  getGraphItemLabels(node: LabelOwnerGraphItem<Meta>): Meta['label'][] {
    return this._ownerLabels.get(node)
  }

  getNodePorts(node: Meta['node']): Meta['port'][] {
    return this._ownerPorts.get(node)
  }

  getLabelOwner(label: Meta['label']): LabelOwnerGraphItem<Meta> {
    return label.owner
  }

  getPortOwner(port: Meta['port']): Meta['node'] {
    return port.owner
  }

  getEdgeEndPoints(edge: Meta['edge']): [ConnectableGraphItem<Meta>, ConnectableGraphItem<Meta>] {
    return [edge.source, edge.target]
  }

  getEdgeSource(edge: Meta['edge']): ConnectableGraphItem<Meta> {
    return edge.source
  }

  getEdgeTarget(edge: Meta['edge']): ConnectableGraphItem<Meta> {
    return edge.target
  }

  isEdge(item: GraphItem<Meta>): item is Meta['edge'] {
    return item instanceof ElkJsEdgeImpl
  }

  isLabel(item: GraphItem<Meta>): item is Meta['label'] {
    return item instanceof ElkJsLabelImpl
  }

  isNode(item: GraphItem<Meta>): item is Meta['node'] {
    return item instanceof ElkJsNodeImpl
  }

  isPort(item: GraphItem<Meta>): item is Meta['port'] {
    return item instanceof ElkJsPortImpl
  }

  reduceGraphItems<Result>(items: GraphItem<Meta>[], reducer: ItemReducer<Meta, Result>, initial: Result): Result {
    return items.reduce((result, item) => {
      if (this.isNode(item) && isDefine(reducer.node)) {
        result = reducer.node(item, result)
      } else if (this.isEdge(item) && isDefine(reducer.edge)) {
        result = reducer.edge(item, result)
      } else if (this.isPort(item) && isDefine(reducer.port)) {
        result = reducer.port(item, result)
      } else if (this.isLabel(item) && isDefine(reducer.label)) {
        result = reducer.label(item, result)
      }
      return result
    }, initial)
  }
}

function addToOptionalArray<P extends keyof O, O extends Partial<Record<P, unknown[]>>>(owner: O, prop: P, value: UnwrapArray<O[P]>) {
  const array = owner[prop]
  if (array !== undefined) {
    array.push(value)
  } else {
    owner[prop] = [value] as O[P]
  }
}

function removeFromOptionalArray<P extends keyof O, O extends Partial<Record<P, unknown[]>>>(owner: O, prop: P, value: UnwrapArray<O[P]>) {
  const array = owner[prop]
  if (array === undefined) {
    return
  }

  const index = array.indexOf(value)
  if (index > -1) {
    array.splice(index, 1)
  }
}

function mergeLayoutOptions(owner: { layoutOptions?: LayoutOptions }, optionKey: string, optionValue: string) {
  owner.layoutOptions = Object.assign(owner.layoutOptions || {}, { [optionKey]: optionValue })
}
