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

import { Local, local, select, Selection, ZoomTransform } from 'd3'
import { HasGraphItemKey, LayoutGraphMeta } from 'main/graph/common/layout-graph-definition'

import {
  D3DatumRenderer,
  Layer,
  LayerConfig,
  LayerKey,
  RendererContext,
  RequiredD3DatumRendererFactory,
} from 'main/graph/common/d3-layout-graph-component-definitions'
import { DEFAULT_RENDERER } from 'main/graph/common/d3-layout-graph-default-stlyes'

export const ATTR_ID = 'data-id'
export const ATTR_LAYER = 'data-layer'

export class PlainLayerImpl<Meta extends LayoutGraphMeta, Datum extends HasGraphItemKey> implements Layer<Datum> {

  private readonly _root: Selection<SVGGElement, unknown, SVGSVGElement, unknown>
  private readonly _previousRendererHolder: Local<Required<D3DatumRenderer<Meta, Datum>>>
  private readonly _id: LayerKey
  private readonly _rendererFactory: RequiredD3DatumRendererFactory<Meta, Datum>
  private readonly _data: Set<Datum>
  private _dirty: boolean

  constructor(
    svg: Selection<SVGSVGElement, undefined, HTMLElement, undefined>,
    installRenderer: (renderer: Required<D3DatumRenderer<Meta, Datum>>) => void,
    config: LayerConfig<Meta, Datum>,
    private readonly _invalidate: () => void,
  ) {
    this._dirty = false
    this._data = new Set()
    this._previousRendererHolder = local()
    this._id = config.id
    this._rendererFactory = data => {
      const customRenderer = config.rendererFactory?.(data) ?? {}
      const result = {
        ...DEFAULT_RENDERER,
        ...customRenderer,
      } satisfies ReturnType<RequiredD3DatumRendererFactory<Meta, Datum>>
      installRenderer(result)
      return result
    }
    this._root = svg.selectChildren(`g[${ATTR_LAYER}="${this._id}"]`)
      .data<unknown>([this._id])
      .enter()
      .append('g')
      .attr(ATTR_LAYER, this._id)
  }

  get dirty(): boolean {
    return this._dirty
  }

  add(datum: Datum): void {
    this._data.add(datum)
    this._dirty = true
    this._invalidate()
  }

  remove(datum: Datum): void {
    this._data.delete(datum)
    this._dirty = true
    this._invalidate()
  }

  set(data: Datum[]): void {
    this._data.clear()
    data.forEach(value => this._data.add(value))
    this._dirty = true
    this._invalidate()
  }

  has(datum: Datum): boolean {
    return this._data.has(datum)
  }

  set transform(value: ZoomTransform) {
    this._root.attr('transform', value.toString())
  }

  redraw(context: RendererContext<Meta>): void {
    //eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    this._root.selectChildren<SVGGElement, Datum>(`g`)
      .data([...this._data], datum => datum.id)
      .join(
        toCreate =>
          toCreate.append('g')
            .attr(ATTR_ID, datum => datum.id)
            .each(function (datum) {
              // this.transform.baseVal.initialize(el.ownerSVGElement!.createSVGTransformFromMatrix(this.getCTM()!.inverse().multiply(el.getCTM()!)))
              const renderer = self._rendererFactory(datum)
              self._previousRendererHolder.set(this, renderer)
              const selection = select<SVGGElement, Datum>(this)
              renderer.create(selection, context)
            }),
        toUpdate =>
          toUpdate
            .each(function (datum) {
              // this.transform.baseVal.initialize(el.ownerSVGElement!.createSVGTransformFromMatrix(this.getCTM()!.inverse().multiply(el.getCTM()!)))
              const oldStyler = self._previousRendererHolder.get(this)
              const newStyler = self._rendererFactory(datum)
              self._previousRendererHolder.set(this, newStyler)
              const selection = select<SVGGElement, Datum>(this)
              if (oldStyler?.id === newStyler.id) {
                newStyler.update(selection, context)
              } else {
                //todo wind better way to recreate. Cause we can't call remove cause it remove group itself
                selection.selectChildren('*').remove()
                // if (isDefine(oldStyler)){
                // oldStyler.remove(selection)
                // }
                newStyler.create(selection, context)
              }
            }),
        toRemove =>
          toRemove
            .each(function (datum) {
              const selection = select<SVGGElement, Datum>(this)
              const renderer = self._previousRendererHolder.get(this) ?? self._rendererFactory(datum)
              self._previousRendererHolder.remove(this)
              renderer.remove(selection, context)
            }),
      )
  }
}