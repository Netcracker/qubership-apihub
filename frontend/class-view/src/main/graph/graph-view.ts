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

import { ViewCallback } from 'main/graph/view-callback'
import { ContentLike } from 'main/domain/like/content'
import ElkConstructor from 'elkjs'
import { AlwaysUniqueChangeableValue, applyCombinedLatest, SimpleChangeableValue } from 'main/core/changeable-value'
import { BuildResult, GraphBuilder, GraphBuilderImpl, resolveGraphItems } from 'main/graph/graph-builder'
import { createLayoutGraph } from 'main/graph/common/elkjs-graph'
import { DIRTY_STATE_LAYOUT } from 'main/graph/common/dirty-state'
import { D3LayoutGraphComponent } from 'main/graph/common/d3-layout-graph-component'
import {
  DomainGraphItem,
  VIEW_TYPE_LEAF_PROPERTY,
  VIEW_TYPE_PROPERTIES_GROUP,
  ViewMeta,
  VirtualRelation,
} from 'main/graph/view-definition'
import { LayoutGraph } from 'main/graph/common/layout-graph-definition'
import { NavigableLike, SelectableLike } from 'main/domain/like/all'
import { Duration, Optional, Pixel, Point, Zoom } from 'main/domain/base'
import { DEFAULT_CONTENT_INSETS, DEFAULT_VIEWPORT_CENTER, DEFAULT_ZOOM } from 'main/defaults'
import { NavigateOptions } from 'main/component/class-view-api'
import { MutableRectangle } from 'main/graph/common/geometry/mutable-rectangle'
import { isDefine } from 'main/core/utils'
import { NODE_RENDERER_FACTORY } from 'main/graph/node-style'
import { createLabelRendererFactory, TOOLTIP_LABEL_RENDERER_FACTORY } from 'main/graph/label-style'
import { EDGE_RENDERER_FACTORY, HIGHLIGHTED_RELATION_EDGE_RENDERER_FACTORY } from 'main/graph/edge-style'
import { PORT_RENDERER_FACTORY } from 'main/graph/port-style'
import { TextServiceImpl } from 'main/graph/common/text-service'
import { Config, Layer, Viewport } from 'main/graph/common/d3-layout-graph-component-definitions'

export interface DeferredNavigate {
  readonly objects: NavigableLike[];
  readonly options: NavigateOptions;
}

export interface DeferredOperations {
  readonly navigate: Optional<DeferredNavigate>;
}

export interface ApplyChangesOptions {
  readonly animationDuration: Duration;
}

export class GraphView {
  private readonly _graphSource: AlwaysUniqueChangeableValue<ContentLike>
  private readonly _selection: SimpleChangeableValue<SelectableLike[]>
  private readonly _zoom: SimpleChangeableValue<Zoom>
  private readonly _viewportCenter: SimpleChangeableValue<Point<Pixel>>
  private readonly _graphBuilder: GraphBuilder<ViewMeta>
  private readonly _mutableGraph: LayoutGraph<ViewMeta>
  private readonly _graphComponent: D3LayoutGraphComponent<ViewMeta>
  private readonly _highlightedRelationsLayer: Layer<VirtualRelation>
  private readonly _tooltipLayer: Layer<ViewMeta['label']>
  private _lastBuildGraphResult: BuildResult<ViewMeta>
  private _ignoreViewportChangeEvent: boolean
  private _deferredOperations: Optional<DeferredOperations>

  constructor(
    private readonly _graphContainer: HTMLElement,
    private readonly _viewCallback: ViewCallback,
  ) {
    this._ignoreViewportChangeEvent = false
    this._mutableGraph = createLayoutGraph<ViewMeta>(new ElkConstructor())
    const textService = new TextServiceImpl(this._graphContainer)
    this._graphComponent = new D3LayoutGraphComponent<ViewMeta>(this._mutableGraph, this._graphContainer, <Config<ViewMeta>>{
      selectionChangeCallback: newSelection => {
        this._viewCallback.selectionChange(newSelection.map(value => value.userObject.like))
      },
      viewportChangeCallback: newViewport => {
        if (this._viewportCenter.changeValue(newViewport.center)) {
          this._viewportCenter.valueApplied()
          if (!this._ignoreViewportChangeEvent) {
            this._viewCallback.viewportCenterChange(newViewport.center)
          }
        }
        if (this._zoom.changeValue(newViewport.zoom)) {
          this._zoom.valueApplied()
          if (!this._ignoreViewportChangeEvent) {
            this._viewCallback.zoomChange(newViewport.zoom)
          }
        }
      },
    })
    this._highlightedRelationsLayer =
      this._graphComponent.createPlainLayerAboveContent(
        {
          id: 'highlighted-relations',
          rendererFactory: HIGHLIGHTED_RELATION_EDGE_RENDERER_FACTORY,
        })
    this._tooltipLayer =
      this._graphComponent.createPlainLayerAboveContent(
        {
          id: 'tooltip',
          rendererFactory: TOOLTIP_LABEL_RENDERER_FACTORY,
        })
    this._graphComponent.nodeRendererFactory = NODE_RENDERER_FACTORY
    this._graphComponent.edgeRendererFactory = EDGE_RENDERER_FACTORY
    this._graphComponent.portRendererFactory = PORT_RENDERER_FACTORY
    this._graphComponent.labelRendererFactory = createLabelRendererFactory(this._tooltipLayer)

    this._graphBuilder = new GraphBuilderImpl<ViewMeta>(this._mutableGraph, textService)
    this._graphSource = new AlwaysUniqueChangeableValue({ classes: [], relations: [] })
    this._selection = new SimpleChangeableValue([])
    this._zoom = new SimpleChangeableValue(DEFAULT_ZOOM)
    this._viewportCenter = new SimpleChangeableValue(DEFAULT_VIEWPORT_CENTER)
    this._lastBuildGraphResult = this.buildGraph(this._graphSource.value)
  }

  public set graphSource(content: ContentLike) {
    this._graphSource.changeValue(content)
  }

  public set selection(selection: SelectableLike[]) {
    this._selection.changeValue(selection)
  }

  public set viewportCenter(center: Point<Pixel>) {
    this._viewportCenter.changeValue(center)
  }

  public set zoom(zoom: Zoom) {
    this._zoom.changeValue(zoom)
  }

  public set deferredOperations(deferred: DeferredOperations) {
    this._deferredOperations = deferred
  }

  private buildGraph(content: ContentLike): BuildResult<ViewMeta> {
    return this._graphBuilder.buildGraph(content)
  }

  get dirty(): boolean {
    return this._graphSource.dirty || this._selection.dirty || this._zoom.dirty || this._viewportCenter.dirty || isDefine(this._deferredOperations)
  }

  public async applyChanges({ animationDuration }: ApplyChangesOptions): Promise<void> {
    //todo what if not finished previous call?
    const viewportDirectlyDefined = applyCombinedLatest(this._zoom, this._viewportCenter, (zoom, center) => {
      this._graphComponent.viewport = { zoom, center }
      this._ignoreViewportChangeEvent = true
    })
    if (this._graphSource.dirty) {
      this._tooltipLayer.set([])
      this._lastBuildGraphResult = this.buildGraph(this._graphSource.value)
      if (this._lastBuildGraphResult.dirtyState === DIRTY_STATE_LAYOUT) {
        this._viewCallback.layoutStart()
        await this._mutableGraph.doLayout()
        if (
          this._lastBuildGraphResult.createdCount > 0
          && this._lastBuildGraphResult.updatedCount === 0
          && !isDefine(this._deferredOperations?.navigate)
          && !viewportDirectlyDefined
        ) {
          this._deferredOperations = Object.assign(this._deferredOperations ?? {}, {
            navigate: {
              //todo or object or vector to object for nice morphing
              objects: [...this._graphSource.value.classes, ...this._graphSource.value.relations],
              options: {
                insets: DEFAULT_CONTENT_INSETS,
              },
            },
          } satisfies DeferredOperations)
        }
        // this._mutableGraph.dump()
        this._viewCallback.layoutFinish()
      }
      this._graphSource.valueApplied()
      this._graphComponent.invalidateGraph()
    }
    if (this._selection.dirty) {
      const graphItems = resolveGraphItems(this._lastBuildGraphResult, this._selection.value)
      this._graphComponent.selection = graphItems
      this._highlightedRelationsLayer.set(this.buildHighlightedRelations(graphItems))
      this._selection.valueApplied()
    }
    if (isDefine(this._deferredOperations) && isDefine(this._deferredOperations.navigate)) {
      const viewportCandidate = this.evaluateTargetViewport(
        this._graphContainer,
        this._lastBuildGraphResult, this._deferredOperations.navigate,
      )
      if (isDefine(viewportCandidate)) {
        this._graphComponent.viewport = viewportCandidate
        this._ignoreViewportChangeEvent = false
      }
      this._deferredOperations = undefined
    }
    await this._graphComponent.applyChanges({ animationDuration })
    this._ignoreViewportChangeEvent = false
  }

  private evaluateTargetViewport(container: HTMLElement, newBuildGraphResult: BuildResult<ViewMeta>, navigate: DeferredNavigate): Optional<Viewport> {
    const newGraphItems = resolveGraphItems(newBuildGraphResult, navigate.objects)
    const totalBoundsMutable = this._mutableGraph.reduceGraphItems(newGraphItems, {
      node: (node, accumulator) => accumulator.addRectangle(this._mutableGraph.getAbsoluteNodeCenter(node), this._mutableGraph.getNodeSize(node)),
      edge: (edge, accumulator) => this._mutableGraph.getAbsoluteEdgePath(edge).reduce((rectangle, point) => rectangle.addPoint(point), accumulator),
      port: (port, accumulator) => accumulator.addRectangle(this._mutableGraph.getAbsolutePortCenter(port), this._mutableGraph.getPortSize(port)),
      label: (label, accumulator) => accumulator.addRectangle(this._mutableGraph.getAbsoluteLabelCenter(label), this._mutableGraph.getLabelSize(label)),
    }, new MutableRectangle())
    if (!totalBoundsMutable.isFinite()) {
      return undefined
    }
    const insets = navigate.options.insets
    const totalBounds = totalBoundsMutable.toImmutable()
    const zoom = Math.min((container.clientWidth - insets.left - insets.right) / totalBounds.width, (container.clientHeight - insets.top - insets.bottom) / totalBounds.height, DEFAULT_ZOOM)
    const leftInsetInGraph = insets.left / zoom
    const rightInsetInGraph = insets.right / zoom
    const topInsetInGraph = insets.top / zoom
    const bottomInsetInGraph = insets.bottom / zoom
    const availableWidthInGraph = container.clientWidth / zoom
    const availableHeightInGraph = container.clientHeight / zoom

    const unusedWidth = availableWidthInGraph - leftInsetInGraph - rightInsetInGraph - totalBounds.width
    const unusedHeight = availableHeightInGraph - topInsetInGraph - bottomInsetInGraph - totalBounds.height
    const xShift = unusedWidth === 0 ? (-Math.max(leftInsetInGraph, unusedWidth) + Math.max(rightInsetInGraph, unusedWidth)) / 2.0 : 0
    const yShift = unusedHeight === 0 ? (-Math.max(topInsetInGraph, unusedHeight) + Math.max(bottomInsetInGraph, unusedHeight)) / 2.0 : 0
    return {
      zoom,
      center: {
        x: -(totalBounds.centerX + xShift),
        y: -(totalBounds.centerY + yShift),
      },
    }
  }

  private buildHighlightedRelations(graphItems: DomainGraphItem<ViewMeta>[]): VirtualRelation[] {
    return graphItems.flatMap(graphItem => {
      if (graphItem.userObject.type === VIEW_TYPE_LEAF_PROPERTY || graphItem.userObject.type === VIEW_TYPE_PROPERTIES_GROUP) {
        return [...graphItem.userObject.connectedRelations]
      } else {
        return []
      }
    })
  }
}
