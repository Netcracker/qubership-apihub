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

import { ViewMeta } from 'main/graph/view-definition'
import { Integer, Pixel, SHAPE_ROUND_RECTANGLE } from 'main/domain'
import { Selection } from 'd3'
import {
  DEFAULT_CLASS_ROUND_RECT_RADIUS,
  DEFAULT_CLASS_SHAPE_FILL_COLOR,
  DEFAULT_CLASS_SHAPE_SELECTION_FILL_COLOR,
  DEFAULT_CLASS_SHAPE_STROKE,
  DEFAULT_CLASS_SHAPE_STROKE_WIDTH,
  DEFAULT_CLASS_SPLITTER_COLOR,
  DEFAULT_CLASS_SPLITTER_LENGTH,
  DEFAULT_PROPERTIES_GROUP_SPLITTER_PADDING_LEFT,
  DEFAULT_PROPERTIES_GROUP_SPLITTER_PADDING_RIGHT,
} from 'main/defaults'
import { D3DatumRendererFactory, RendererContext } from 'main/graph/common/d3-layout-graph-component-definitions'

function roundRectRadius(datum: ViewMeta['node']): Pixel {
  switch (datum.userObject.like.shape) {
    case SHAPE_ROUND_RECTANGLE:
      return DEFAULT_CLASS_ROUND_RECT_RADIUS
    default:
      return 0
  }
}

interface Separator {
  index: Integer
  x1: Pixel
  y: Pixel
  x2: Pixel
}

function manageSeparators(selection: Selection<SVGGElement, ViewMeta['node'], null, unknown>, context: RendererContext<ViewMeta>) {
  selection.selectChildren<SVGLineElement, Separator>('line')
    .data<Separator>(datum => datum.userObject.separatorOffsetsFromCenter.map((offset, index) => ({
      index,
      x1: datum.selfCenterRelativeToParentNodeCenter.x - datum.size.width / 2.0 + DEFAULT_PROPERTIES_GROUP_SPLITTER_PADDING_LEFT,
      y: datum.selfCenterRelativeToParentNodeCenter.y + offset,
      x2: datum.selfCenterRelativeToParentNodeCenter.x + datum.size.width / 2.0 - DEFAULT_PROPERTIES_GROUP_SPLITTER_PADDING_RIGHT,
    })), (datum: Separator) => datum.index)
    .join(
      (container) => {
        return container.append('line')
          .attr('x1', datum => datum.x1)
          .attr('y1', datum => datum.y)
          .attr('x2', datum => datum.x2)
          .attr('y2', datum => datum.y)
          .attr('stroke', DEFAULT_CLASS_SPLITTER_COLOR)
          .attr('stroke-width', DEFAULT_CLASS_SPLITTER_LENGTH)
          .attr('opacity', 0)
          .interrupt()
          .transition(context.transition)
          .attr('opacity', 1)
      },
      (line) => {
        return line
          .interrupt()
          .transition(context.transition)
          .attr('x1', datum => datum.x1)
          .attr('y1', datum => datum.y)
          .attr('x2', datum => datum.x2)
          .attr('y2', datum => datum.y)
      },
      (el) => {
        el.interrupt()
          .transition(context.transition)
          .attr('opacity', 0)
          .end().then(() => el.remove())
      },
    )
}

export const NODE_RENDERER_FACTORY: D3DatumRendererFactory<ViewMeta, ViewMeta['node']> = () => {
  return {
    id: 'class-node',
    create(selection, context): void {
      selection.append('rect')
        .attr('x', datum => datum.selfCenterRelativeToParentNodeCenter.x - datum.size.width / 2.0)
        .attr('y', datum => datum.selfCenterRelativeToParentNodeCenter.y - datum.size.height / 2.0)
        .attr('rx', roundRectRadius)
        .attr('ry', roundRectRadius)
        .attr('width', datum => datum.size.width)
        .attr('height', datum => datum.size.height)
        .attr('stroke', DEFAULT_CLASS_SHAPE_STROKE)
        .attr('stroke-width', DEFAULT_CLASS_SHAPE_STROKE_WIDTH)
        .attr('fill', datum => context.isSelected(datum) ? DEFAULT_CLASS_SHAPE_SELECTION_FILL_COLOR : DEFAULT_CLASS_SHAPE_FILL_COLOR)

        .attr('vector-effect', 'non-scaling-stroke')
        .attr('cursor', 'pointer')
      manageSeparators(selection, context)
      selection
        .attr('opacity', 0)
        .interrupt()
        .transition(context.transition)
        .attr('opacity', 1)
    },
    update(selection, context): void {
      selection
        .selectChild('rect')
        .attr('fill', datum => context.isSelected(datum) ? DEFAULT_CLASS_SHAPE_SELECTION_FILL_COLOR : DEFAULT_CLASS_SHAPE_FILL_COLOR)
        .interrupt()
        .transition(context.transition)
        .attr('x', datum => datum.selfCenterRelativeToParentNodeCenter.x - datum.size.width / 2.0)
        .attr('y', datum => datum.selfCenterRelativeToParentNodeCenter.y - datum.size.height / 2.0)
        .attr('rx', roundRectRadius)
        .attr('ry', roundRectRadius)
        .attr('width', datum => datum.size.width)
        .attr('height', datum => datum.size.height)
      manageSeparators(selection, context)
    },
    remove(selection, context) {
      selection
        .interrupt()
        .transition(context.transition)
        .attr('opacity', 0)
        .end().then(() => selection.remove())
    },
  }
}