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
  BaseType,
  D3ZoomEvent,
  interpolate,
  Local,
  local,
  select,
  Selection,
  Transition,
  TransitionLike,
  zoom,
  ZoomBehavior,
  ZoomTransform,
} from 'd3'
import {
  DEFAULT_EDGE_RENDERER,
  DEFAULT_LABEL_RENDERER,
  DEFAULT_NODE_RENDERER,
  DEFAULT_PORT_RENDERER,
} from 'main/graph/common/d3-layout-graph-default-stlyes'
import { HasGraphItemKey, LayoutGraph, LayoutGraphMeta } from 'main/graph/common/layout-graph-definition'
import domElementSelection, {
  DomSelectionBehavior,
  SELECTION_CHANGE_EVENT_TYPE,
} from 'main/graph/common/selection-behavior'
import { GraphItem } from 'main/graph/common/graph-definition'
import { isDefine } from 'main/core/utils'
import { Optional } from 'main/domain/base'
import { SvgResourceManager } from 'main/graph/common/svg-resource-manager'
import { ATTR_ID, ATTR_LAYER, PlainLayerImpl } from 'main/graph/common/layers'
import {
  ApplyChangesOptions,
  Config,
  D3DatumRenderer,
  D3DatumRendererFactory,
  Layer,
  LayerConfig,
  RendererContext,
  RequiredD3DatumRendererFactory,
  Viewport,
} from 'main/graph/common/d3-layout-graph-component-definitions'
import { DEFAULT_EDGE_SMOOTH_RADIUS } from 'main/defaults'

const ROLE_NODE = 'node'
const ROLE_EDGE = 'edge'
const ROLE_LABEL = 'label'
const ROLE_PORT = 'port'

const ATTR_ROLE = 'data-role'

const ATTR_VALUE_ROOT_LAYER = 'root-layer'
const ATTR_VALUE_LABEL_LAYER = 'label-layer'
const ATTR_VALUE_PORT_LAYER = 'port-layer'
const ATTR_VALUE_CONTENT_LAYER = 'content-layer'

export class D3LayoutGraphComponent<Meta extends LayoutGraphMeta> {
  private readonly _svg: Selection<SVGSVGElement, undefined, HTMLElement, undefined>
  private readonly _contentLayer: Selection<SVGGElement, unknown, SVGSVGElement, unknown>
  private readonly _aboveContentLayers: PlainLayerImpl<Meta, HasGraphItemKey & unknown>[]
  private readonly _svgResourceManager: SvgResourceManager
  private readonly _previousNodeRendererHolder: Local<Required<D3DatumRenderer<Meta, Meta['node']>>>
  private readonly _previousEdgeRendererHolder: Local<Required<D3DatumRenderer<Meta, Meta['edge']>>>
  private readonly _previousLabelRendererHolder: Local<Required<D3DatumRenderer<Meta, Meta['label']>>>
  private readonly _previousPortRendererHolder: Local<Required<D3DatumRenderer<Meta, Meta['port']>>>
  private readonly _zoomBehavior: ZoomBehavior<SVGSVGElement, undefined>
  private readonly _selectionBehavior: DomSelectionBehavior<SVGGElement, SVGSVGElement, GraphItem<Meta>>
  private readonly _installedRenderers: Set<D3DatumRenderer<never, never>['id']> = new Set()
  private _nodeRendererFactory: RequiredD3DatumRendererFactory<Meta, Meta['node']>
  private _edgeRendererFactory: RequiredD3DatumRendererFactory<Meta, Meta['edge']>
  private _labelRendererFactory: RequiredD3DatumRendererFactory<Meta, Meta['label']>
  private _portRendererFactory: RequiredD3DatumRendererFactory<Meta, Meta['port']>
  private _deferredSelection: Optional<GraphItem<Meta>[]>
  private _deferredViewport: Optional<Viewport>
  private _graphInvalidated: boolean
  private _updateScheduled: boolean

  constructor(
    private readonly _graph: LayoutGraph<Meta>,
    private readonly _container: HTMLElement,
    config: Config<Meta> = {},
  ) {
    this._graphInvalidated = false
    this._updateScheduled = false
    this._aboveContentLayers = []
    this._installedRenderers = new Set()
    this._svg = select<HTMLElement, undefined>(this._container)
      .selectChildren(`svg[${ATTR_LAYER}="${ATTR_VALUE_ROOT_LAYER}"]`).data<undefined>([undefined]).enter()
      .append('svg')
      .attr(ATTR_LAYER, ATTR_VALUE_ROOT_LAYER)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('width', '100%')
      .attr('height', '100%')
    new ResizeObserver(([{ contentRect }]) => {
      this._svg.attr('viewBox', `${-contentRect.width / 2.0} ${-contentRect.height / 2.0} ${contentRect.width} ${contentRect.height}`)
    }).observe(this._container)
    this._contentLayer = this._svg
      .selectChildren(`g[${ATTR_LAYER}="${ATTR_VALUE_CONTENT_LAYER}"]`)
      .data<unknown>([ATTR_VALUE_CONTENT_LAYER])
      .enter()
      .append('g')
      .attr(ATTR_LAYER, ATTR_VALUE_CONTENT_LAYER)

    this._selectionBehavior = domElementSelection<SVGGElement, SVGSVGElement, GraphItem<Meta>>(this._svg)
    this._selectionBehavior.filter = event => event.buttons === 1 //todo filter edges?
    this._selectionBehavior.on(SELECTION_CHANGE_EVENT_TYPE, (event) => {
      /*apply*///todo add deferred force redraw like in zoom?
      config.selectionChangeCallback?.(event.selection)
    })
    this._zoomBehavior = zoom<SVGSVGElement, undefined>()
      .interpolate(interpolate)
      .on('zoom', (event: D3ZoomEvent<SVGSVGElement, undefined>) => {
        /*apply*/
        this._contentLayer.attr('transform', event.transform.toString())
        this._aboveContentLayers.forEach(layer => layer.transform = event.transform)
        /*notify*/
        config.viewportChangeCallback?.({
          zoom: event.transform.k,
          center: { x: event.transform.x / event.transform.k, y: event.transform.y / event.transform.k },
        })
      })
    this._svg.call(this._zoomBehavior).on('dblclick.zoom', null)
    this._previousNodeRendererHolder = local()
    this._previousEdgeRendererHolder = local()
    this._previousLabelRendererHolder = local()
    this._previousPortRendererHolder = local()
    this._svgResourceManager = new SvgResourceManager(this._svg)
    this._nodeRendererFactory = () => {
      const result = {
        ...DEFAULT_NODE_RENDERER,
      } satisfies Required<D3DatumRenderer<Meta, Meta['node']>>
      this.installRenderer(result)
      return result
    }
    this._edgeRendererFactory = () => {
      const result = {
        ...DEFAULT_EDGE_RENDERER,
      } satisfies Required<D3DatumRenderer<Meta, Meta['edge']>>
      this.installRenderer(result)
      return result
    }
    this._labelRendererFactory = () => {
      const result = {
        ...DEFAULT_LABEL_RENDERER,
      } satisfies Required<D3DatumRenderer<Meta, Meta['label']>>
      this.installRenderer(result)
      return result
    }
    this._portRendererFactory = () => {
      const result = {
        ...DEFAULT_PORT_RENDERER,
      } satisfies Required<D3DatumRenderer<Meta, Meta['port']>>
      this.installRenderer(result)
      return result
    }
  }

  private installRenderer<Datum>(renderer: Required<D3DatumRenderer<Meta, Datum>>,
  ): void {
    if (!this._installedRenderers.has(renderer.id)) {
      this._installedRenderers.add(renderer.id)
      renderer.installResources(this._svgResourceManager)//todo cleanup? when?
    }
  }

  set nodeRendererFactory(factory: D3DatumRendererFactory<Meta, Meta['node']>) {
    this._nodeRendererFactory = (node) => {
      const customRenderer = factory(node) ?? {}
      const result = {
        ...DEFAULT_NODE_RENDERER,
        ...customRenderer,
      } satisfies ReturnType<RequiredD3DatumRendererFactory<Meta, Meta['node']>>
      this.installRenderer(result)
      return result
    }
    //todo schedule repaint
  }

  set edgeRendererFactory(factory: D3DatumRendererFactory<Meta, Meta['edge']>) {
    this._edgeRendererFactory = (edge) => {
      const customRenderer = factory(edge) ?? {}
      const result = {
        ...DEFAULT_EDGE_RENDERER,
        ...customRenderer,
      } satisfies ReturnType<RequiredD3DatumRendererFactory<Meta, Meta['edge']>>
      this.installRenderer(result)
      return result
    }
    //todo schedule repaint
  }

  set portRendererFactory(factory: D3DatumRendererFactory<Meta, Meta['port']>) {
    this._portRendererFactory = (port) => {
      const customRenderer = factory(port) ?? {}
      const result = {
        ...DEFAULT_PORT_RENDERER,
        ...customRenderer,
      } satisfies ReturnType<RequiredD3DatumRendererFactory<Meta, Meta['port']>>
      this.installRenderer(result)
      return result
    }
    //todo schedule repaint
  }

  set labelRendererFactory(factory: D3DatumRendererFactory<Meta, Meta['label']>) {
    this._labelRendererFactory = (label) => {
      const customRenderer = factory(label) ?? {}
      const result = {
        ...DEFAULT_LABEL_RENDERER,
        ...customRenderer,
      } satisfies ReturnType<RequiredD3DatumRendererFactory<Meta, Meta['label']>>
      this.installRenderer(result)
      return result
    }
    //todo schedule repaint
  }

  public createPlainLayerAboveContent<Datum extends HasGraphItemKey>(config: LayerConfig<Meta, Datum>): Layer<Datum> {
    const layer = new PlainLayerImpl<Meta, Datum>(this._svg, renderer => this.installRenderer(renderer), config, () => this.scheduleInternalApplyChanges())
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this._aboveContentLayers.push(layer)
    //todo schedule repaint
    return layer
  }

  invalidateGraph(): void {
    this._graphInvalidated = true
  }

  set selection(value: GraphItem<Meta>[]) {
    this._deferredSelection = value
  }

  set viewport(viewport: Viewport) {
    this._deferredViewport = viewport
  }

  private scheduleInternalApplyChanges(): void {
    if (this._updateScheduled) {
      return
    }
    this._updateScheduled = true
    requestAnimationFrame(async () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.applyChangesInternal(this._svg.transition('internal').duration(0))
      this._updateScheduled = false
    })
  }

  async applyChanges({ animationDuration }: ApplyChangesOptions): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const transition: Transition<BaseType, unknown, null, unknown> = this._svg.transition('main')
      .duration(animationDuration)
    this.applyChangesInternal(transition)
    return transition.end()
      .catch(reason => {
        if (isDefine(reason)) {
          console.error(reason)
        }
        return void (0)
      })
  }

  private applyChangesInternal(trans: Transition<BaseType, unknown, null, unknown>): void {
    //todo interupt previous transition
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (isDefine(this._deferredViewport)) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const zoomTrans: TransitionLike<SVGSVGElement, undefined> = trans
      this._zoomBehavior.transform(zoomTrans, new ZoomTransform(this._deferredViewport.zoom, this._deferredViewport.zoom * this._deferredViewport.center.x, this._deferredViewport.zoom * this._deferredViewport.center.y))
    }
    if (isDefine(this._deferredSelection)) {
      this._selectionBehavior.selection = this._deferredSelection
    }
    const rendererContext = this.createContext(trans)
    if (this._graphInvalidated || isDefine(this._deferredSelection)) {
      this.redrawNodes(rendererContext)
      this.redrawEdges(rendererContext)
    }
    this._aboveContentLayers.filter(value => value.dirty).forEach(layer => layer.redraw(rendererContext))

    this._deferredSelection = undefined
    this._graphInvalidated = false
    this._deferredViewport = undefined
  }

  private createContext(transition: Transition<BaseType, unknown, null, unknown>): RendererContext<Meta> {
    return {
      transition: transition,
      graph: this._graph,
      isSelected: (datum) => this._selectionBehavior.isSelected(datum),
      resourceReader: this._svgResourceManager,
    }
  }

  private redrawItems<Datum extends GraphItem<Meta>, DomContainer extends SVGSVGElement | SVGGElement>(
    role: string,
    items: Datum[],
    containerSelector: Selection<SVGGElement, unknown, DomContainer, unknown>,
    context: RendererContext<Meta>,
    rendererFactory: (userObject: Datum) => Required<D3DatumRenderer<Meta, Datum>>,
    previousRendererLocalStorage: Local<Required<D3DatumRenderer<Meta, Datum>>>,
    selectionBehavior: DomSelectionBehavior<SVGGElement, SVGSVGElement, GraphItem<Meta>>,
  ): Selection<SVGGElement, Datum, SVGGElement, unknown> {
    return containerSelector.selectChildren<SVGGElement, Datum>(`g[${ATTR_ROLE}="${role}"]`)
      .data(items, datum => datum.id)
      .join(
        toCreate =>
          toCreate.append('g')
            .attr(ATTR_ROLE, role)
            .attr(ATTR_ID, datum => datum.id)
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            .call(selection => selectionBehavior.watch(selection))
            .each(function (datum) {
              const renderer = rendererFactory(datum)
              previousRendererLocalStorage.set(this, renderer)
              const selection = select<SVGGElement, Datum>(this)
              renderer.create(selection, context)
            }),
        toUpdate =>
          toUpdate
            .each(function (datum) {
              const oldRenderer = previousRendererLocalStorage.get(this)
              const newRenderer = rendererFactory(datum)
              previousRendererLocalStorage.set(this, newRenderer)
              const selection = select<SVGGElement, Datum>(this)
              if (oldRenderer?.id === newRenderer.id) {
                newRenderer.update(selection, context)
              } else {
                //todo wind better way to recreate. Cause we can't call remove cause it remove group itself
                selection.selectChildren('*').remove()
                // if (isDefine(oldRenderer)){
                // oldRenderer.remove(selection)
                // }
                newRenderer.create(selection, context)
              }
            }),
        toRemove =>
          toRemove
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            .call(selection => selectionBehavior.unwatch(selection))
            .each(function (datum) {
              const selection = select<SVGGElement, Datum>(this)
              const renderer = previousRendererLocalStorage.get(this) ?? rendererFactory(datum)
              previousRendererLocalStorage.remove(this)
              renderer.remove(selection, context)
            }),
      )
  }

  private redrawNodes(context: RendererContext<Meta>): void {
    const graph = this._graph
    const thisRedrawItems = this.redrawItems.bind(this)
    const labelRendererFactory = this._labelRendererFactory.bind(this)
    const portRendererFactory = this._portRendererFactory.bind(this)
    const previousLabelStyleHolder = this._previousLabelRendererHolder
    const previousPortStyleHolder = this._previousPortRendererHolder
    const selectionBehaviour = this._selectionBehavior
    this.redrawItems(
      ROLE_NODE,
      graph.nodes,
      this._contentLayer,
      context,
      this._nodeRendererFactory,
      this._previousNodeRendererHolder,
      selectionBehaviour)
      .each(function (node) {
        const portGroup = select<SVGGElement, Meta['node']>(this)
          .selectChildren<SVGGElement, unknown>(`g[${ATTR_LAYER}="${ATTR_VALUE_PORT_LAYER}"]`)
          .data<unknown>([ATTR_VALUE_PORT_LAYER])
          .join<SVGGElement>(elem =>
              elem.append('g')
                .attr(ATTR_LAYER, ATTR_VALUE_PORT_LAYER)
                .attr('transform', `translate(${node.selfCenterRelativeToParentNodeCenter.x},${node.selfCenterRelativeToParentNodeCenter.y})`),
            elem => elem
              .interrupt()
              .transition(context.transition)//todo we don't know does styler use animation or not
              .attr('transform', `translate(${node.selfCenterRelativeToParentNodeCenter.x},${node.selfCenterRelativeToParentNodeCenter.y})`),
          )
        thisRedrawItems(
          ROLE_PORT,
          graph.getNodePorts(node),
          portGroup,
          context,
          portRendererFactory,
          previousPortStyleHolder,
          selectionBehaviour,
        )

        const labelGroup = select<SVGGElement, Meta['node']>(this)
          .selectChildren<SVGGElement, unknown>(`g[${ATTR_LAYER}="${ATTR_VALUE_LABEL_LAYER}"]`)
          .data<unknown>([ATTR_VALUE_LABEL_LAYER])
          .join<SVGGElement>(elem =>
              elem.append('g')
                .attr(ATTR_LAYER, ATTR_VALUE_LABEL_LAYER)
                .attr('transform', `translate(${node.selfCenterRelativeToParentNodeCenter.x},${node.selfCenterRelativeToParentNodeCenter.y})`),
            elem => elem
              .interrupt()
              .transition(context.transition)//todo we don't know does styler use animation or not
              .attr('transform', `translate(${node.selfCenterRelativeToParentNodeCenter.x},${node.selfCenterRelativeToParentNodeCenter.y})`),
          )
        thisRedrawItems(
          ROLE_LABEL,
          graph.getGraphItemLabels(node),
          labelGroup,
          context,
          labelRendererFactory,
          previousLabelStyleHolder,
          selectionBehaviour,
        )
      })
  }

  private redrawEdges(context: RendererContext<Meta>): void {
    this.redrawItems(
      ROLE_EDGE,
      this._graph.edges,
      this._contentLayer,
      context,
      this._edgeRendererFactory,
      this._previousEdgeRendererHolder,
      this._selectionBehavior)
    //todo labels
    this._svgResourceManager.setAbsoluteJointPointsMask(
      this._graph.edges
        .flatMap(edge => this._graph.getAbsoluteEdgePath(edge)),
      DEFAULT_EDGE_SMOOTH_RADIUS,
    )
  }
}