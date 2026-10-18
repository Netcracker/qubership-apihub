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
  EdgePath,
  LayoutGraphMeta,
  LocatableEdge,
  LocatableLabel,
  LocatableNode,
  LocatablePort,
} from 'main/graph/common/layout-graph-definition'
import { roundCommands } from 'svg-round-corners'
import { DEFAULT_EDGE_SMOOTH_RADIUS } from 'main/defaults'
import { Selection } from 'd3'
import { D3DatumRenderer } from 'main/graph/common/d3-layout-graph-component-definitions'

/* eslint-disable @typescript-eslint/no-explicit-any */
export const DEFAULT_RENDERER: Required<D3DatumRenderer<LayoutGraphMeta, any/*unknown actually*/>> = {
  id: 'default-unknown',
  installResources(): void {},
  create(): void {},
  update(): void {},
  remove(container: Selection<SVGGElement, any/*unknown actually*/, null, unknown>): void {
    container.remove()
  },
}

export const DEFAULT_NODE_RENDERER: Required<D3DatumRenderer<LayoutGraphMeta, LocatableNode<unknown>>> = {
  ...DEFAULT_RENDERER,
  id: 'default-node',
  create(selection, context): void {
    selection.append('rect')
      .attr('x', datum => datum.selfCenterRelativeToParentNodeCenter.x - datum.size.width / 2.0)
      .attr('y', datum => datum.selfCenterRelativeToParentNodeCenter.y - datum.size.height / 2.0)
      .attr('width', datum => datum.size.width)
      .attr('height', datum => datum.size.height)
      .attr('stroke', 'black')
      .attr('stroke-width', datum => context.isSelected(datum) ? '1px' : '0px')
      .attr('fill', 'green')
      .attr('fill-opacity', 0)
      .attr('vector-effect', 'non-scaling-stroke')
      .interrupt()
      .transition(context.transition)
      .attr('fill-opacity', 1)
  },
  update(selection, context): void {
    selection
      .selectChild('rect')
      .attr('x', datum => datum.selfCenterRelativeToParentNodeCenter.x - datum.size.width / 2.0)
      .attr('y', datum => datum.selfCenterRelativeToParentNodeCenter.y - datum.size.height / 2.0)
      .attr('width', datum => datum.size.width)
      .attr('height', datum => datum.size.height)
      .attr('stroke-width', datum => context.isSelected(datum) ? '1px' : '0px')
  },
}

export function toSvgPathArray(points: EdgePath): string {
  const newPath = roundCommands(points
      .map((point, index) => ({ marker: index === 0 ? 'M' : 'L', values: { x: point.x, y: point.y } })),
    DEFAULT_EDGE_SMOOTH_RADIUS,
  )
  return newPath.path
}

export const DEFAULT_EDGE_RENDERER: Required<D3DatumRenderer<LayoutGraphMeta, LocatableEdge<unknown>>> = {
  ...DEFAULT_RENDERER,
  id: 'default-edge',
  create(selection, context): void {
    selection.append('path')
      .attr('d', datum => toSvgPathArray(datum.selfPathRelativeToParentNodeCenter))
      .attr('fill', 'none')
      .attr('stroke', 'black')
      .attr('stroke-width', datum => context.isSelected(datum) ? '3px' : '1px')
  },
  update(selection, context): void {
    selection
      .selectChild('path')
      .attr('d', datum => toSvgPathArray(datum.selfPathRelativeToParentNodeCenter))
      .attr('stroke-width', datum => context.isSelected(datum) ? '3px' : '1px')
  },
}

export const DEFAULT_LABEL_RENDERER: Required<D3DatumRenderer<LayoutGraphMeta, LocatableLabel<unknown>>> = {
  ...DEFAULT_RENDERER,
  id: 'default-label',
  create(selection, context): void {
    selection.append('rect')
      .attr('x', datum => datum.selfCenterRelativeToNodeCenter.x - datum.size.width / 2.0)
      .attr('y', datum => datum.selfCenterRelativeToNodeCenter.y - datum.size.height / 2.0)
      .attr('width', datum => datum.size.width)
      .attr('height', datum => datum.size.height)
      .attr('fill', datum => context.isSelected(datum) ? 'lightgreen' : 'lightgray')
    selection.append('text')
      .attr('font-size', '12px')
      .attr('x', datum => datum.selfCenterRelativeToNodeCenter.x - datum.size.width / 2.0)
      .attr('y', datum => datum.selfCenterRelativeToNodeCenter.y - datum.size.height / 2.0)
      .attr('alignment-baseline', 'hanging')
      .text(datum => datum.labelText)
  },
  update(selection, context): void {
    selection
      .selectChild('rect')
      .text(datum => datum.labelText)
      .attr('x', datum => datum.selfCenterRelativeToNodeCenter.x - datum.size.width / 2.0)
      .attr('y', datum => datum.selfCenterRelativeToNodeCenter.y - datum.size.height / 2.0)
      .attr('width', datum => datum.size.width)
      .attr('height', datum => datum.size.height)
      .attr('fill', datum => context.isSelected(datum) ? 'lightgreen' : 'lightgray')
    selection
      .selectChild('text')
      .text(datum => datum.labelText)
      .attr('x', datum => datum.selfCenterRelativeToNodeCenter.x - datum.size.width / 2.0)
      .attr('y', datum => datum.selfCenterRelativeToNodeCenter.y - datum.size.height / 2.0)
  },
}

export const DEFAULT_PORT_RENDERER: Required<D3DatumRenderer<LayoutGraphMeta, LocatablePort<unknown>>> = {
  ...DEFAULT_RENDERER,
  id: 'default-port',
  create(selection, context): void {
    selection.append('circle')
      .attr('cx', datum => datum.selfCenterRelativeToNodeCenter.x)
      .attr('cy', datum => datum.selfCenterRelativeToNodeCenter.y)
      .attr('r', datum => Math.min(datum.size.width, datum.size.height))
      .attr('stroke', 'black')
      .attr('stroke-width', datum => context.isSelected(datum) ? '1px' : '0px')
      .attr('fill', 'yellow')
      .attr('fill-opacity', 0)
      .attr('vector-effect', 'non-scaling-stroke')
      .interrupt()
      .transition(context.transition)
      .attr('fill-opacity', 1)
  },
  update(selection, context): void {
    selection
      .selectChild('circle')
      .attr('cx', datum => datum.selfCenterRelativeToNodeCenter.x)
      .attr('cy', datum => datum.selfCenterRelativeToNodeCenter.y)
      .attr('r', datum => Math.min(datum.size.width, datum.size.height))
      .attr('stroke-width', datum => context.isSelected(datum) ? '1px' : '0px')
  },
}