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

import { OneLineText, Pixel, Point, Size } from 'main/domain/base'
import { GraphMeta, IGraph, ModificationAppliers } from 'main/graph/common/graph-definition'

export type GraphItemKey = string

export type EdgePath = Point<Pixel>[]

export interface LayoutGraphMeta extends GraphMeta {
  readonly key: GraphItemKey;
  readonly graph: LayoutGraph<this>;
  readonly node: LocatableNode<unknown>;
  readonly edge: LocatableEdge<unknown>;
  readonly port: LocatablePort<unknown>;
  readonly label: LocatableLabel<unknown>;
}

export interface LayoutGraph<Meta extends GraphMeta> extends IGraph<Meta> {
  getNodeSize(node: Meta['node']): Size<Pixel>

  setNodeSize(node: Meta['node'], size: Size<Pixel>): void

  getNodeCenterRelativeToParentNodeCenter(node: Meta['node']): Point<Pixel>

  setNodeCenterRelativeToParentNodeCenter(node: Meta['node'], center: Point<Pixel>): void

  getAbsoluteNodeCenter(node: Meta['node']): Point<Pixel>

  // setAbsoluteNodeCenter(node: Meta['node'], size: Size<Pixel>): void

  getEdgePathRelativeToParentNodeCenter(edge: Meta['edge']): EdgePath

  // setEdgePathRelativeToParentNodeCenter(edge: Meta['edge'], path: EdgePath): void

  getAbsoluteEdgePath(edge: Meta['edge']): EdgePath

  // setAbsoluteEdgePath(edge: Meta['edge'], path: EdgePath): void

  getLabelText(label: Meta['label']): OneLineText

  setLabelText(label: Meta['label'], text: OneLineText): void

  getLabelSize(label: Meta['label']): Size<Pixel>

  setLabelSize(label: Meta['label'], size: Size<Pixel>): void

  getLabelCenterRelativeToNodeCenter(label: Meta['label']): Point<Pixel>

  setLabelCenterRelativeToNodeCenter(label: Meta['label'], center: Point<Pixel>): void

  getAbsoluteLabelCenter(label: Meta['label']): Point<Pixel>

  // setAbsoluteLabelCenter(label: Meta['label'], center: Point<Pixel>): void

  getPortSize(port: Meta['port']): Size<Pixel>

  setPortSize(port: Meta['port'], size: Size<Pixel>): void

  getPortCenterRelativeToNodeCenter(port: Meta['port']): Point<Pixel>

  setPortCenterRelativeToNodeCenter(port: Meta['port'], center: Point<Pixel>): void

  getAbsolutePortCenter(port: Meta['port']): Point<Pixel>

  // setAbsolutePortCenter(port: Meta['port'], center: Point<Pixel>): void

  doLayout(): Promise<void>

  dump(): void
}

export interface HasGraphItemKey {
  readonly id: GraphItemKey
}

export interface LocatableGraphItem<UserObject> extends HasGraphItemKey {
  //mutations only using graph api
  readonly userObject: UserObject
}

export interface LocatableNode<UserObject> extends LocatableGraphItem<UserObject> {
  //mutations only using graph api
  readonly selfCenterRelativeToParentNodeCenter: Point<Pixel>
  readonly size: Size<Pixel>
}

export interface LocatableEdge<UserObject> extends LocatableGraphItem<UserObject> {
  //mutations only using graph api
  readonly selfPathRelativeToParentNodeCenter: EdgePath
}

export interface LocatablePort<UserObject> extends LocatableGraphItem<UserObject> {
  //mutations only using graph api
  readonly selfCenterRelativeToNodeCenter: Point<Pixel>
  readonly size: Size<Pixel>
}

export interface LocatableLabel<UserObject> extends LocatableGraphItem<UserObject> {
  //mutations only using graph api
  readonly selfCenterRelativeToNodeCenter: Point<Pixel>
  readonly size: Size<Pixel>
  readonly labelText: OneLineText
}

export type NodeViewModificationAppliers<Meta extends GraphMeta, View> = ModificationAppliers<Meta['graph'], Extract<Meta['node'], LocatableNode<View>>, View>
export type EdgeViewModificationAppliers<Meta extends GraphMeta, View> = ModificationAppliers<Meta['graph'], Extract<Meta['edge'], LocatableEdge<View>>, View>
export type PortViewModificationAppliers<Meta extends GraphMeta, View> = ModificationAppliers<Meta['graph'], Extract<Meta['port'], LocatablePort<View>>, View>
export type LabelViewModificationAppliers<Meta extends GraphMeta, View> = ModificationAppliers<Meta['graph'], Extract<Meta['label'], LocatableLabel<View>>, View>