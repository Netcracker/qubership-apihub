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

import { EdgePath, LocatableEdge } from 'main/graph/common/layout-graph-definition'
import {
  IncludePropertiesGroupRelationView,
  PropertyToClassRelationView,
  VIEW_TYPE_GROUP_TO_CLASS_RELATION,
  VIEW_TYPE_PROPERTY_TO_CLASS_RELATION,
  ViewMeta,
  VirtualRelation,
} from 'main/graph/view-definition'
import {
  DEFAULT_EDGE_SMOOTH_RADIUS,
  DEFAULT_INCLUDE_PROPERTIES_GROUP_RELATION_SELECTION_STROKE_COLOR,
  DEFAULT_INCLUDE_PROPERTIES_GROUP_RELATION_SELECTION_STROKE_WIDTH,
  DEFAULT_INCLUDE_PROPERTIES_GROUP_RELATION_STROKE_COLOR,
  DEFAULT_INCLUDE_PROPERTIES_GROUP_RELATION_STROKE_WIDTH,
  DEFAULT_PROPERTY_TO_CLASS_RELATION_SELECTION_STROKE_COLOR,
  DEFAULT_PROPERTY_TO_CLASS_RELATION_SELECTION_STROKE_WIDTH,
  DEFAULT_PROPERTY_TO_CLASS_RELATION_STROKE_COLOR,
  DEFAULT_PROPERTY_TO_CLASS_RELATION_STROKE_WIDTH,
} from 'main/defaults'
import { toSvgPathArray } from 'main/graph/common/d3-layout-graph-default-stlyes'
import { SvgResourceDefiner } from 'main/graph/common/svg-resource-manager'
import arrowIcon from 'assets/link-end.svg?raw'
import { Color, Pixel } from 'main/domain'
import {
  D3DatumRenderer,
  D3DatumRendererFactory,
  RendererContext,
} from 'main/graph/common/d3-layout-graph-component-definitions'
import {
  LIKE_TYPE_INCLUDE_PROPERTIES_GROUP_RELATION,
  LIKE_TYPE_PROPERTY_TO_CLASS_RELATION,
} from 'main/domain/like/type'

const ICON_ARROW_END = 'arrow-end'
const ICON_ARROW_END_SELECTED = 'arrow-end-selected'

const parser = new DOMParser()
const ATTR_ROLE = 'data-role'
const ATTR_ROLE_VALUE_MAIN = 'path-main'
const ATTR_ROLE_VALUE_BRIDGE = 'path-bridge'

function addMarker(resourceManager: SvgResourceDefiner, svg: string, name: PropertyKey, color: Color, refX: Pixel, refY: Pixel): void {
  const endDoc = parser.parseFromString(svg, 'image/svg+xml')
  const endMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker')
  endMarker.setAttribute('markerWidth', endDoc.documentElement.getAttribute('width') || '')
  endMarker.setAttribute('markerHeight', endDoc.documentElement.getAttribute('height') || '')
  endMarker.refX.baseVal.value = refX
  endMarker.refY.baseVal.value = refY
  endMarker.markerUnits.baseVal = SVGMarkerElement.SVG_MARKERUNITS_USERSPACEONUSE
  endMarker.orientType.baseVal = SVGMarkerElement.SVG_MARKER_ORIENT_AUTO
  endMarker.style.fill = color.toString()
  endMarker.appendChild(endDoc.documentElement)
  resourceManager.addDefinition(name, endMarker)
}

function isIndirectlySelected(datum: LocatableEdge<IncludePropertiesGroupRelationView> | LocatableEdge<PropertyToClassRelationView>, context: RendererContext<ViewMeta>): boolean {
  return context.graph.getEdgeEndPoints(datum).some(port => context.isSelected(port))
}

function simpleRelationRendererFactory(
  id: string,
  mainColor: Color, selectionColor: Color,
  mainWidth: Pixel, selectionWidth: Pixel,
): D3DatumRenderer<ViewMeta, LocatableEdge<IncludePropertiesGroupRelationView> | LocatableEdge<PropertyToClassRelationView>> {
  return {
    id,
    installResources(resourceManager: SvgResourceDefiner): void {
      addMarker(resourceManager, arrowIcon, `${id}-${ICON_ARROW_END}`, mainColor, 5, 5)
      addMarker(resourceManager, arrowIcon, `${id}-${ICON_ARROW_END_SELECTED}`, selectionColor, 5, 5)
    },
    create(selection, context): void {
      selection.append('path')
        .attr(ATTR_ROLE, ATTR_ROLE_VALUE_BRIDGE)
        .attr('d', datum => toSvgPathArray(fixStraightPath(datum.selfPathRelativeToParentNodeCenter)))
        .attr('stroke', 'white')
        .attr('stroke-width', 6)
        .attr('fill', 'none')
        .attr('mask', `url(#${context.resourceReader.resolveAbsoluteJointPointsMask()})`)

      //do not remove. This for debug
      // selection.append('rect')
      //   .attr(ATTR_ROLE, ATTR_ROLE_VALUE_BRIDGE)
      //   .attr('x', "-10000")
      //   .attr('y', "-10000")
      //   .attr('width', "20000")
      //   .attr('height', "20000")
      //   .attr('fill', 'green')
      //   .attr('opacity', '0.5')
      //   .attr('mask', `url(#${context.resourceReader.resolveAbsoluteJointPointsMask()})`)

      selection.append('path')
        .attr(ATTR_ROLE, ATTR_ROLE_VALUE_MAIN)
        .attr('d', datum => toSvgPathArray(datum.selfPathRelativeToParentNodeCenter))
        .attr('stroke', datum => context.isSelected(datum) || isIndirectlySelected(datum, context) ? selectionColor : mainColor)
        .attr('stroke-width', datum => context.isSelected(datum) || isIndirectlySelected(datum, context) ? selectionWidth : mainWidth)
        .attr('marker-end', datum => `url(#${context.resourceReader.resolveDefinition(context.isSelected(datum) || isIndirectlySelected(datum, context) ? `${id}-${ICON_ARROW_END_SELECTED}` : `${id}-${ICON_ARROW_END}`)})`)
        .attr('fill', 'none')
      selection
        .attr('opacity', 0)
        .interrupt()
        .transition(context.transition)
        .attr('opacity', 1)
    },
    update(selection, context): void {
      selection
        .selectChild(`path[${ATTR_ROLE}="${ATTR_ROLE_VALUE_MAIN}"]`)
        .attr('stroke', datum => context.isSelected(datum) || isIndirectlySelected(datum, context) ? selectionColor : mainColor)
        .attr('stroke-width', datum => context.isSelected(datum) || isIndirectlySelected(datum, context) ? selectionWidth : mainWidth)
        .attr('marker-end', datum => `url(#${context.resourceReader.resolveDefinition(context.isSelected(datum) || isIndirectlySelected(datum, context) ? `${id}-${ICON_ARROW_END_SELECTED}` : `${id}-${ICON_ARROW_END}`)})`)
        //too ugly because we have round corners
        // .interrupt()
        // .transition(context.transition)
        .attr('d', datum => toSvgPathArray(datum.selfPathRelativeToParentNodeCenter))
      selection
        .selectChild(`path[${ATTR_ROLE}="${ATTR_ROLE_VALUE_BRIDGE}"]`)
        .attr('d', datum => toSvgPathArray(fixStraightPath(datum.selfPathRelativeToParentNodeCenter)))
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

//doesn't use the stroke-width when calculating dimensions for masks and filters, so you can't mask a shape like a horizontal or vertical line (zero-height/zero-width bounding box) using default mask parameters
function fixStraightPath(path: EdgePath): EdgePath {
  if (new Set(path.map(pt => pt.x)).size === 1) {
    return [{ x: path[0].x - 2 * DEFAULT_EDGE_SMOOTH_RADIUS, y: path[0].y }, ...path]
  }
  if (new Set(path.map(pt => pt.y)).size === 1) {
    return [{ x: path[0].x, y: path[0].y - 2 * DEFAULT_EDGE_SMOOTH_RADIUS }, ...path]
  }
  return path
}

function highlightedRelationRendererFactory(
  id: string,
  mainColor: Color,
  mainWidth: Pixel,
): D3DatumRenderer<ViewMeta, VirtualRelation> {
  return {
    id,
    installResources(resourceManager: SvgResourceDefiner): void {
      addMarker(resourceManager, arrowIcon, `${id}-${ICON_ARROW_END}`, mainColor, 5, 5)
    },
    create(selection, context): void {
      selection.append('path')
        .attr('d', datum => toSvgPathArray(datum.path))
        .attr('stroke', mainColor)
        .attr('stroke-width', mainWidth)
        .attr('marker-end', `url(#${context.resourceReader.resolveDefinition(`${id}-${ICON_ARROW_END}`)})`)
        .attr('fill', 'none')
    },
    update(selection): void {
      selection
        .selectChild('path')
        .attr('d', datum => toSvgPathArray(datum.path))
    },
  }
}

const GROUP_TO_CLASS_RELATION_RENDERER = simpleRelationRendererFactory('include',
  DEFAULT_INCLUDE_PROPERTIES_GROUP_RELATION_STROKE_COLOR, DEFAULT_INCLUDE_PROPERTIES_GROUP_RELATION_SELECTION_STROKE_COLOR,
  DEFAULT_INCLUDE_PROPERTIES_GROUP_RELATION_STROKE_WIDTH, DEFAULT_INCLUDE_PROPERTIES_GROUP_RELATION_SELECTION_STROKE_WIDTH,
)
const PROPERTY_TO_CLASS_RELATION_RENDERER = simpleRelationRendererFactory('reference',
  DEFAULT_PROPERTY_TO_CLASS_RELATION_STROKE_COLOR, DEFAULT_PROPERTY_TO_CLASS_RELATION_SELECTION_STROKE_COLOR,
  DEFAULT_PROPERTY_TO_CLASS_RELATION_STROKE_WIDTH, DEFAULT_PROPERTY_TO_CLASS_RELATION_SELECTION_STROKE_WIDTH,
)
export const EDGE_RENDERER_FACTORY: D3DatumRendererFactory<ViewMeta, ViewMeta['edge']> = ((edge) => {
  switch (edge.userObject.type) {
    case VIEW_TYPE_GROUP_TO_CLASS_RELATION:
      return GROUP_TO_CLASS_RELATION_RENDERER
    case VIEW_TYPE_PROPERTY_TO_CLASS_RELATION:
      return PROPERTY_TO_CLASS_RELATION_RENDERER
  }
}) as D3DatumRendererFactory<ViewMeta, ViewMeta['edge']>

const HIGHLIGHTED_GROUP_TO_CLASS_RELATION_RENDERER = highlightedRelationRendererFactory('include-highlighted',
  DEFAULT_INCLUDE_PROPERTIES_GROUP_RELATION_SELECTION_STROKE_COLOR, DEFAULT_INCLUDE_PROPERTIES_GROUP_RELATION_SELECTION_STROKE_WIDTH,
)
const HIGHLIGHTED_PROPERTY_TO_CLASS_RELATION_RENDERER = highlightedRelationRendererFactory('reference-highlighted',
  DEFAULT_PROPERTY_TO_CLASS_RELATION_SELECTION_STROKE_COLOR, DEFAULT_PROPERTY_TO_CLASS_RELATION_SELECTION_STROKE_WIDTH,
)
export const HIGHLIGHTED_RELATION_EDGE_RENDERER_FACTORY: D3DatumRendererFactory<ViewMeta, VirtualRelation> = ((relation) => {
  switch (relation.like.type) {
    case LIKE_TYPE_INCLUDE_PROPERTIES_GROUP_RELATION:
      return HIGHLIGHTED_GROUP_TO_CLASS_RELATION_RENDERER
    case LIKE_TYPE_PROPERTY_TO_CLASS_RELATION:
      return HIGHLIGHTED_PROPERTY_TO_CLASS_RELATION_RENDERER
  }
})