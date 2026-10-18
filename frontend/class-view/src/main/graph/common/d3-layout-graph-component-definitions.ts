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

import { HasGraphItemKey, LayoutGraphMeta } from 'main/graph/common/layout-graph-definition'
import { GraphItem } from 'main/graph/common/graph-definition'
import { SvgResourceDefiner, SvgResourceReader } from 'main/graph/common/svg-resource-manager'
import { BaseType, Selection, Transition } from 'd3'
import { Duration, Pixel, Point, Zoom } from 'main/domain'

export interface RendererContext<Meta extends LayoutGraphMeta> {

  readonly graph: Meta['graph']

  readonly transition: Transition<BaseType, unknown, null, unknown>;

  isSelected(item: GraphItem<Meta>): boolean;

  readonly resourceReader: SvgResourceReader
}

export type D3DatumRendererFactory<Meta extends LayoutGraphMeta, Datum> = (datum: Datum) => D3DatumRenderer<Meta, Datum>
export type RequiredD3DatumRendererFactory<Meta extends LayoutGraphMeta, Datum> = (datum: Datum) => Required<D3DatumRenderer<Meta, Datum>>

export interface D3DatumRenderer<Meta extends LayoutGraphMeta, Datum> {
  readonly id: string;

  installResources?(resourceDefiner: SvgResourceDefiner): void

  create(container: Selection<SVGGElement, Datum, null, unknown>, context: RendererContext<Meta>): void

  update?(container: Selection<SVGGElement, Datum, null, unknown>, context: RendererContext<Meta>): void

  remove?(container: Selection<SVGGElement, Datum, null, unknown>, context: RendererContext<Meta>): void
}

export interface Viewport {
  readonly zoom: Zoom,
  readonly center: Point<Pixel>
}

export interface ApplyChangesOptions {
  readonly animationDuration: Duration;
}

export interface Config<Meta extends LayoutGraphMeta> {
  readonly selectionChangeCallback?: (newSelection: GraphItem<Meta>[]) => void
  readonly viewportChangeCallback?: (newViewport: Viewport) => void
}

export type LayerKey = string

export interface LayerConfig<Meta extends LayoutGraphMeta, Datum extends HasGraphItemKey> {
  readonly id: LayerKey
  readonly rendererFactory?: (datum: Datum) => D3DatumRenderer<Meta, Datum>
}

export interface Layer<Datum extends HasGraphItemKey> {
  add(datum: Datum): void

  remove(datum: Datum): void

  has(datum: Datum): boolean

  set(data: Datum[]): void
}