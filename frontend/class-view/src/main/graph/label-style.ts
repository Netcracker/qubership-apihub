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
  ClassView,
  LeafPropertyView,
  PropertiesGroupView,
  VIEW_TYPE_CLASS,
  VIEW_TYPE_LEAF_PROPERTY,
  VIEW_TYPE_PROPERTIES_GROUP,
  ViewMeta,
} from 'main/graph/view-definition'
import { LocatableLabel } from 'main/graph/common/layout-graph-definition'
import {
  DEFAULT_CLASS_MARGIN_LEFT,
  DEFAULT_CLASS_SHAPE_FILL_COLOR,
  DEFAULT_CLASS_SHAPE_SELECTION_FILL_COLOR,
  DEFAULT_CLASS_SPLITTER_PADDING_LEFT,
  DEFAULT_CLASS_SPLITTER_PADDING_RIGHT,
  DEFAULT_CLASS_TITLE_FONT_SIZE,
  DEFAULT_CLASS_TITLE_FONT_WEIGHT,
  DEFAULT_FULL_TEXT_LABEL_ROUND_RECT_RADIUS,
  DEFAULT_LEAF_PROPERTY_FONT_SIZE,
  DEFAULT_LEAF_PROPERTY_FONT_WEIGHT,
  DEFAULT_LEAF_PROPERTY_NAME_FONT_COLOR,
  DEFAULT_LEAF_PROPERTY_REQUIRED_FONT_COLOR,
  DEFAULT_LEAF_PROPERTY_SELECTION_FILL_COLOR,
  DEFAULT_LEAF_PROPERTY_TYPE_FONT_COLOR,
  DEFAULT_PROPERTIES_GROUP_FONT_COLOR,
  DEFAULT_PROPERTIES_GROUP_FONT_SIZE,
  DEFAULT_PROPERTIES_GROUP_FONT_WEIGHT,
  DEFAULT_PROPERTIES_GROUP_ICON_PADDING_LEFT,
  DEFAULT_PROPERTIES_GROUP_ICON_SIZE,
  DEFAULT_PROPERTIES_GROUP_ICON_TO_NAME_SEPARATOR_LENGTH,
  DEFAULT_PROPERTIES_GROUP_SELECTION_FILL_COLOR,
} from 'main/defaults'
import groupIcon from 'assets/group-icon.svg?raw'
import { SvgResourceDefiner } from 'main/graph/common/svg-resource-manager'
import { D3DatumRenderer, D3DatumRendererFactory, Layer } from 'main/graph/common/d3-layout-graph-component-definitions'

function createClassLabelMainFactory(tooltipLayer: Layer<LocatableLabel<ClassView>>): D3DatumRenderer<ViewMeta, LocatableLabel<ClassView>> {
  return {
    id: 'class-label-main',
    create(selection, context): void {
      const text = selection.append('text')
        .attr('font-size', DEFAULT_CLASS_TITLE_FONT_SIZE)
        .attr('font-weight', DEFAULT_CLASS_TITLE_FONT_WEIGHT)
        .attr('x', datum => datum.selfCenterRelativeToNodeCenter.x - datum.size.width / 2.0)
        .attr('y', datum => datum.selfCenterRelativeToNodeCenter.y)
        .attr('alignment-baseline', 'middle')
        .attr('text-decoration', datum => datum.userObject.like.deprecated ? 'line-through' : 'none')
        .text(datum => datum.userObject.croppedText)
        .on('mouseenter', (_, datum) => {
          text.attr('opacity', 0)
          tooltipLayer.add(datum)
        })
        .on('mouseleave', (_, datum) => {
          tooltipLayer.remove(datum)
          text.attr('opacity', 1)
        })
      selection
        .attr('opacity', 0)
        .interrupt()
        .transition(context.transition)
        .attr('opacity', 1)
    },
    update(selection, context): void {
      selection
        .selectChild('text')
        .attr('text-decoration', datum => datum.userObject.like.deprecated ? 'line-through' : 'none')
        .text(datum => datum.userObject.croppedText)
        .attr('opacity', datum => tooltipLayer.has(datum) ? 0 : 1)
        .interrupt()
        .transition(context.transition)
        .attr('x', datum => datum.selfCenterRelativeToNodeCenter.x - datum.size.width / 2.0)
        .attr('y', datum => datum.selfCenterRelativeToNodeCenter.y)
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

const LABEL_CLASS_OVERLAY_RENDERER: D3DatumRenderer<ViewMeta, LocatableLabel<ClassView>> = {
  id: 'class-label-overlay',
  create(selection, context): void {
    selection.attr('pointer-events', 'none')
    const text = selection.append('text')
      .attr('font-size', DEFAULT_CLASS_TITLE_FONT_SIZE)
      .attr('font-weight', DEFAULT_CLASS_TITLE_FONT_WEIGHT)
      .attr('x', datum => context.graph.getAbsoluteLabelCenter(datum).x - datum.size.width / 2.0)
      .attr('y', datum => context.graph.getAbsoluteLabelCenter(datum).y)
      .attr('alignment-baseline', 'middle')
      .attr('text-decoration', datum => datum.userObject.like.deprecated ? 'line-through' : 'none')
      .text(datum => datum.userObject.like.name)
    selection.insert('rect', () => text.node())
      .attr('x', datum => context.graph.getAbsoluteLabelCenter(datum).x - datum.size.width / 2.0)
      .attr('y', datum => context.graph.getAbsoluteLabelCenter(datum).y - datum.size.height / 2.0)
      .attr('rx', DEFAULT_FULL_TEXT_LABEL_ROUND_RECT_RADIUS)
      .attr('ry', DEFAULT_FULL_TEXT_LABEL_ROUND_RECT_RADIUS)
      .attr('width', () => text.node()!.getBBox().width + DEFAULT_CLASS_SPLITTER_PADDING_RIGHT)
      .attr('height', datum => datum.size.height)
      .attr('fill', datum => {
        if (context.isSelected(datum)) {
          return DEFAULT_CLASS_SHAPE_SELECTION_FILL_COLOR
        }
        return DEFAULT_CLASS_SHAPE_FILL_COLOR
      })
  },
  update(selection, context): void {
    const text = selection
      .selectChild<SVGTextElement>('text')
      .text(datum => datum.userObject.like.name)
      .attr('text-decoration', datum => datum.userObject.like.deprecated ? 'line-through' : 'none')
      .interrupt()
      .transition(context.transition)
      .attr('x', datum => context.graph.getAbsoluteLabelCenter(datum).x - datum.size.width / 2.0)
      .attr('y', datum => context.graph.getAbsoluteLabelCenter(datum).y)
    selection
      .selectChild('rect')
      .attr('x', datum => context.graph.getAbsoluteLabelCenter(datum).x - datum.size.width / 2.0)
      .attr('y', datum => context.graph.getAbsoluteLabelCenter(datum).y - datum.size.height / 2.0)
      .attr('width', () => text.node()!.getBBox().width + DEFAULT_CLASS_SPLITTER_PADDING_RIGHT)
      .attr('height', datum => datum.size.height)
      .attr('fill', datum => {
        if (context.isSelected(datum)) {
          return DEFAULT_CLASS_SHAPE_SELECTION_FILL_COLOR
        }
        return DEFAULT_CLASS_SHAPE_FILL_COLOR
      })
  },
}

const LEAF_PROPERTY_TEXT_PART_NAME = 'name'
const LEAF_PROPERTY_TEXT_PART_REQUIRED = 'required'
const LEAF_PROPERTY_TEXT_PART_TYPE = 'type'

const TRANSPARENT_COLOR = 'rgba(0,0,0,0)'

function createLeafPropertyLabelMainFactory(tooltipLayer: Layer<LocatableLabel<LeafPropertyView>>): D3DatumRenderer<ViewMeta, LocatableLabel<LeafPropertyView>> {
  return {
    id: 'leaf-property-label-main',
    create(selection, context): void {
      selection.append('rect')
        .attr('x', datum => datum.selfCenterRelativeToNodeCenter.x - datum.size.width / 2.0 + DEFAULT_CLASS_SPLITTER_PADDING_LEFT)
        .attr('y', datum => datum.selfCenterRelativeToNodeCenter.y - datum.size.height / 2.0)
        .attr('width', datum => datum.size.width - DEFAULT_CLASS_SPLITTER_PADDING_LEFT - DEFAULT_CLASS_SPLITTER_PADDING_RIGHT)
        .attr('height', datum => datum.size.height)
        .attr('fill', datum => context.isSelected(datum) ? DEFAULT_LEAF_PROPERTY_SELECTION_FILL_COLOR : TRANSPARENT_COLOR)
        .attr('cursor', 'pointer')
      const text = selection.append('text')
        .attr('font-size', DEFAULT_LEAF_PROPERTY_FONT_SIZE)
        .attr('font-weight', DEFAULT_LEAF_PROPERTY_FONT_WEIGHT)
        .attr('x', datum => datum.selfCenterRelativeToNodeCenter.x - datum.size.width / 2.0 + DEFAULT_CLASS_MARGIN_LEFT)
        .attr('y', datum => datum.selfCenterRelativeToNodeCenter.y)
        .attr('cursor', 'pointer')
      text.append('tspan')
        .attr('data-text-part', LEAF_PROPERTY_TEXT_PART_NAME)
        .attr('fill', DEFAULT_LEAF_PROPERTY_NAME_FONT_COLOR)
        .attr('alignment-baseline', 'middle')
        .attr('text-decoration', datum => datum.userObject.like.deprecated ? 'line-through' : 'none')
        .text(datum => datum.userObject.croppedName)
      text.append('tspan')
        .attr('data-text-part', LEAF_PROPERTY_TEXT_PART_REQUIRED)
        .attr('fill', DEFAULT_LEAF_PROPERTY_REQUIRED_FONT_COLOR)
        .attr('alignment-baseline', 'middle')
        .text(datum => datum.userObject.croppedRequiredCharacter)
      text.append('tspan')
        .attr('data-text-part', LEAF_PROPERTY_TEXT_PART_TYPE)
        .attr('fill', DEFAULT_LEAF_PROPERTY_TYPE_FONT_COLOR)
        .attr('alignment-baseline', 'middle')
        .attr('text-decoration', datum => datum.userObject.like.propertyTypeDeprecated ? 'line-through' : 'none')
        .text(datum => datum.userObject.croppedType)
      selection
        .on('mouseenter', (_, datum) => {
          text.attr('opacity', 0)
          tooltipLayer.add(datum)
        })
        .on('mouseleave', (_, datum) => {
          tooltipLayer.remove(datum)
          text.attr('opacity', 1)
        })
        .attr('opacity', 0)
        .interrupt()
        .transition(context.transition)
        .attr('opacity', 1)
    },
    update(selection, context): void {
      selection.selectChild('rect')
        .attr('fill', datum => context.isSelected(datum) ? DEFAULT_LEAF_PROPERTY_SELECTION_FILL_COLOR : TRANSPARENT_COLOR)
        .interrupt()
        .transition(context.transition)
        .attr('x', datum => datum.selfCenterRelativeToNodeCenter.x - datum.size.width / 2.0 + DEFAULT_CLASS_SPLITTER_PADDING_LEFT)
        .attr('y', datum => datum.selfCenterRelativeToNodeCenter.y - datum.size.height / 2.0)
        .attr('width', datum => datum.size.width - DEFAULT_CLASS_SPLITTER_PADDING_LEFT - DEFAULT_CLASS_SPLITTER_PADDING_RIGHT)
        .attr('height', datum => datum.size.height)
      const text = selection.selectChild('text')
      text
        .attr('opacity', datum => tooltipLayer.has(datum) ? 0 : 1)
        .interrupt()
        .transition(context.transition)
        .attr('x', datum => datum.selfCenterRelativeToNodeCenter.x - datum.size.width / 2.0 + DEFAULT_CLASS_MARGIN_LEFT)
        .attr('y', datum => datum.selfCenterRelativeToNodeCenter.y)
      text.selectChild(`tspan[data-text-part="${LEAF_PROPERTY_TEXT_PART_NAME}"]`)
        .attr('text-decoration', datum => datum.userObject.like.deprecated ? 'line-through' : 'none')
        .text(datum => datum.userObject.croppedName)
      text.selectChild(`tspan[data-text-part="${LEAF_PROPERTY_TEXT_PART_REQUIRED}"]`)
        .text(datum => datum.userObject.croppedRequiredCharacter)
      text.selectChild(`tspan[data-text-part="${LEAF_PROPERTY_TEXT_PART_TYPE}"]`)
        .attr('text-decoration', datum => datum.userObject.like.propertyTypeDeprecated ? 'line-through' : 'none')
        .text(datum => datum.userObject.croppedType)
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

const LABEL_LEAF_PROPERTY_OVERLAY_RENDERER: D3DatumRenderer<ViewMeta, LocatableLabel<LeafPropertyView>> = {
  id: 'leaf-property-label-overlay',
  create(selection, context): void {
    selection.attr('pointer-events', 'none')
    const text = selection.append('text')
      .attr('font-size', DEFAULT_LEAF_PROPERTY_FONT_SIZE)
      .attr('font-weight', DEFAULT_LEAF_PROPERTY_FONT_WEIGHT)
      .attr('x', datum => context.graph.getAbsoluteLabelCenter(datum).x - datum.size.width / 2.0 + DEFAULT_CLASS_MARGIN_LEFT)
      .attr('y', datum => context.graph.getAbsoluteLabelCenter(datum).y)
      .attr('cursor', 'pointer')
    text.append('tspan')
      .attr('data-text-part', LEAF_PROPERTY_TEXT_PART_NAME)
      .attr('fill', DEFAULT_LEAF_PROPERTY_NAME_FONT_COLOR)
      .attr('alignment-baseline', 'middle')
      .attr('text-decoration', datum => datum.userObject.like.deprecated ? 'line-through' : 'none')
      .text(datum => datum.userObject.like.name)
    text.append('tspan')
      .attr('data-text-part', LEAF_PROPERTY_TEXT_PART_REQUIRED)
      .attr('fill', DEFAULT_LEAF_PROPERTY_REQUIRED_FONT_COLOR)
      .attr('alignment-baseline', 'middle')
      .text(datum => datum.userObject.requiredCharacter)
    text.append('tspan')
      .attr('data-text-part', LEAF_PROPERTY_TEXT_PART_TYPE)
      .attr('fill', DEFAULT_LEAF_PROPERTY_TYPE_FONT_COLOR)
      .attr('alignment-baseline', 'middle')
      .attr('text-decoration', datum => datum.userObject.like.propertyTypeDeprecated ? 'line-through' : 'none')
      .text(datum => datum.userObject.like.propertyType)
    selection.insert('rect', () => text.node())
      .attr('x', datum => context.graph.getAbsoluteLabelCenter(datum).x - datum.size.width / 2.0 + DEFAULT_CLASS_SPLITTER_PADDING_LEFT)
      .attr('y', datum => context.graph.getAbsoluteLabelCenter(datum).y - datum.size.height / 2.0)
      .attr('rx', DEFAULT_FULL_TEXT_LABEL_ROUND_RECT_RADIUS)
      .attr('ry', DEFAULT_FULL_TEXT_LABEL_ROUND_RECT_RADIUS)
      .attr('width', () => text.node()!.getBBox().width + DEFAULT_CLASS_SPLITTER_PADDING_RIGHT)
      .attr('height', datum => datum.size.height)
      .attr('fill', datum => {
        if (context.isSelected(datum)) {
          return DEFAULT_LEAF_PROPERTY_SELECTION_FILL_COLOR
        }
        if (context.isSelected(context.graph.getLabelOwner(datum))) {
          return DEFAULT_CLASS_SHAPE_SELECTION_FILL_COLOR
        }
        return DEFAULT_CLASS_SHAPE_FILL_COLOR
      })
      .attr('opacity', datum =>
        datum.userObject.croppedName === datum.userObject.like.name
        && datum.userObject.croppedRequiredCharacter === datum.userObject.requiredCharacter
        && datum.userObject.croppedType === datum.userObject.like.propertyType
          ? 0 : 1)
  },
  update(selection, context): void {
    const text = selection.selectChild<SVGTextElement>('text')
    text
      .interrupt()
      .transition(context.transition)
      .attr('x', datum => context.graph.getAbsoluteLabelCenter(datum).x - datum.size.width / 2.0 + DEFAULT_CLASS_MARGIN_LEFT)
      .attr('y', datum => context.graph.getAbsoluteLabelCenter(datum).y)
    text.selectChild(`tspan[data-text-part="${LEAF_PROPERTY_TEXT_PART_NAME}"]`)
      .attr('text-decoration', datum => datum.userObject.like.deprecated ? 'line-through' : 'none')
      .text(datum => datum.userObject.like.name)
    text.selectChild(`tspan[data-text-part="${LEAF_PROPERTY_TEXT_PART_REQUIRED}"]`)
      .text(datum => datum.userObject.requiredCharacter)
    text.selectChild(`tspan[data-text-part="${LEAF_PROPERTY_TEXT_PART_TYPE}"]`)
      .attr('text-decoration', datum => datum.userObject.like.propertyTypeDeprecated ? 'line-through' : 'none')
      .text(datum => datum.userObject.like.propertyType)
    selection.selectChild('rect')
      .attr('x', datum => context.graph.getAbsoluteLabelCenter(datum).x - datum.size.width / 2.0 + DEFAULT_CLASS_SPLITTER_PADDING_LEFT)
      .attr('y', datum => context.graph.getAbsoluteLabelCenter(datum).y - datum.size.height / 2.0)
      .attr('width', () => text.node()!.getBBox().width + DEFAULT_CLASS_SPLITTER_PADDING_LEFT)
      .attr('height', datum => datum.size.height)
      .attr('fill', datum => {
        if (context.isSelected(datum)) {
          return DEFAULT_LEAF_PROPERTY_SELECTION_FILL_COLOR
        }
        if (context.isSelected(context.graph.getLabelOwner(datum))) {
          return DEFAULT_CLASS_SHAPE_SELECTION_FILL_COLOR
        }
        return DEFAULT_CLASS_SHAPE_FILL_COLOR
      })
      .attr('opacity', datum =>
        datum.userObject.croppedName === datum.userObject.like.name
        && datum.userObject.croppedRequiredCharacter === datum.userObject.requiredCharacter
        && datum.userObject.croppedType === datum.userObject.like.propertyType
          ? 0 : 1)
  },
}

const ICON_GROUP = 'group-icon'

function createPropertiesGroupLabelMainFactory(tooltipLayer: Layer<LocatableLabel<PropertiesGroupView>>): D3DatumRenderer<ViewMeta, LocatableLabel<PropertiesGroupView>> {
  return {
    id: 'properties-group-label-main',
    installResources(resourceManager: SvgResourceDefiner): void {
      const parser = new DOMParser()
      const doc = parser.parseFromString(groupIcon, 'image/svg+xml')
      resourceManager.addDefinition(ICON_GROUP, doc.documentElement)
    },
    create(selection, context): void {
      selection.append('rect')
        .attr('x', datum => datum.selfCenterRelativeToNodeCenter.x - datum.size.width / 2.0 + DEFAULT_CLASS_SPLITTER_PADDING_LEFT)
        .attr('y', datum => datum.selfCenterRelativeToNodeCenter.y - datum.size.height / 2.0)
        .attr('width', datum => datum.size.width - DEFAULT_CLASS_SPLITTER_PADDING_LEFT - DEFAULT_CLASS_SPLITTER_PADDING_RIGHT)
        .attr('height', datum => datum.size.height)
        .attr('fill', datum => context.isSelected(datum) ? DEFAULT_PROPERTIES_GROUP_SELECTION_FILL_COLOR : TRANSPARENT_COLOR)
        .attr('cursor', 'pointer')
      selection.append('use')
        .attr('xlink:href', `#${context.resourceReader.resolveDefinition(ICON_GROUP)}`)
        .attr('fill', DEFAULT_PROPERTIES_GROUP_FONT_COLOR)
        .attr('x', datum => datum.selfCenterRelativeToNodeCenter.x - datum.size.width / 2.0 + DEFAULT_PROPERTIES_GROUP_ICON_PADDING_LEFT)
        .attr('y', datum => datum.selfCenterRelativeToNodeCenter.y - datum.size.height / 2.0)
      const text = selection.append('text')
        .attr('font-size', DEFAULT_PROPERTIES_GROUP_FONT_SIZE)
        .attr('font-weight', DEFAULT_PROPERTIES_GROUP_FONT_WEIGHT)
        .attr('fill', DEFAULT_PROPERTIES_GROUP_FONT_COLOR)
        .attr('x', datum => datum.selfCenterRelativeToNodeCenter.x - datum.size.width / 2.0 + DEFAULT_PROPERTIES_GROUP_ICON_PADDING_LEFT + DEFAULT_PROPERTIES_GROUP_ICON_SIZE + DEFAULT_PROPERTIES_GROUP_ICON_TO_NAME_SEPARATOR_LENGTH)
        .attr('y', datum => datum.selfCenterRelativeToNodeCenter.y)
        .attr('alignment-baseline', 'middle')
        .attr('text-decoration', datum => datum.userObject.like.deprecated ? 'line-through' : 'none')
        .text(datum => datum.userObject.croppedText)
        .on('mouseenter', (_, datum) => {
          text.attr('opacity', 0)
          tooltipLayer.add(datum)
        })
        .on('mouseleave', (_, datum) => {
          tooltipLayer.remove(datum)
          text.attr('opacity', 1)
        })
      selection
        .attr('opacity', 0)
        .interrupt()
        .transition(context.transition)
        .attr('opacity', 1)
    },
    update(selection, context): void {
      selection.selectChild('rect')
        .attr('fill', datum => context.isSelected(datum) ? DEFAULT_PROPERTIES_GROUP_SELECTION_FILL_COLOR : TRANSPARENT_COLOR)
        .interrupt()
        .transition(context.transition)
        .attr('x', datum => datum.selfCenterRelativeToNodeCenter.x - datum.size.width / 2.0 + DEFAULT_CLASS_SPLITTER_PADDING_LEFT)
        .attr('y', datum => datum.selfCenterRelativeToNodeCenter.y - datum.size.height / 2.0)
        .attr('width', datum => datum.size.width - DEFAULT_CLASS_SPLITTER_PADDING_LEFT - DEFAULT_CLASS_SPLITTER_PADDING_RIGHT)
        .attr('height', datum => datum.size.height)
      selection
        .selectChild('text')
        .attr('opacity', datum => tooltipLayer.has(datum) ? 0 : 1)
        .text(datum => datum.userObject.croppedText)
        .attr('text-decoration', datum => datum.userObject.like.deprecated ? 'line-through' : 'none')
        .interrupt()
        .transition(context.transition)
        .attr('x', datum => datum.selfCenterRelativeToNodeCenter.x - datum.size.width / 2.0 + DEFAULT_PROPERTIES_GROUP_ICON_PADDING_LEFT + DEFAULT_PROPERTIES_GROUP_ICON_SIZE + DEFAULT_PROPERTIES_GROUP_ICON_TO_NAME_SEPARATOR_LENGTH)
        .attr('y', datum => datum.selfCenterRelativeToNodeCenter.y)
      selection.selectChild('use')
        .interrupt()
        .transition(context.transition)
        .attr('x', datum => datum.selfCenterRelativeToNodeCenter.x - datum.size.width / 2.0 + DEFAULT_PROPERTIES_GROUP_ICON_PADDING_LEFT)
        .attr('y', datum => datum.selfCenterRelativeToNodeCenter.y - datum.size.height / 2.0)
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

const LABEL_PROPERTIES_GROUP_OVERLAY_RENDERER: D3DatumRenderer<ViewMeta, LocatableLabel<PropertiesGroupView>> = {
  id: 'properties-group-label-overlay',
  create(selection, context): void {
    selection.attr('pointer-events', 'none')
    const text = selection.append('text')
      .attr('font-size', DEFAULT_PROPERTIES_GROUP_FONT_SIZE)
      .attr('font-weight', DEFAULT_PROPERTIES_GROUP_FONT_WEIGHT)
      .attr('fill', DEFAULT_PROPERTIES_GROUP_FONT_COLOR)
      .attr('x', datum => context.graph.getAbsoluteLabelCenter(datum).x - datum.size.width / 2.0 + DEFAULT_PROPERTIES_GROUP_ICON_PADDING_LEFT + DEFAULT_PROPERTIES_GROUP_ICON_SIZE + DEFAULT_PROPERTIES_GROUP_ICON_TO_NAME_SEPARATOR_LENGTH)
      .attr('y', datum => context.graph.getAbsoluteLabelCenter(datum).y)
      .attr('alignment-baseline', 'middle')
      .attr('text-decoration', datum => datum.userObject.like.deprecated ? 'line-through' : 'none')
      .text(datum => datum.userObject.like.name)
    selection.insert('rect', () => text.node())
      .attr('x', datum => context.graph.getAbsoluteLabelCenter(datum).x - datum.size.width / 2.0 + DEFAULT_PROPERTIES_GROUP_ICON_PADDING_LEFT + DEFAULT_PROPERTIES_GROUP_ICON_SIZE + DEFAULT_PROPERTIES_GROUP_ICON_TO_NAME_SEPARATOR_LENGTH)
      .attr('y', datum => context.graph.getAbsoluteLabelCenter(datum).y - datum.size.height / 2.0)
      .attr('rx', DEFAULT_FULL_TEXT_LABEL_ROUND_RECT_RADIUS)
      .attr('ry', DEFAULT_FULL_TEXT_LABEL_ROUND_RECT_RADIUS)
      .attr('width', () => text.node()!.getBBox().width + DEFAULT_CLASS_SPLITTER_PADDING_RIGHT)
      .attr('height', datum => datum.size.height)
      .attr('fill', datum => {
        if (context.isSelected(datum)) {
          return DEFAULT_PROPERTIES_GROUP_SELECTION_FILL_COLOR
        }
        if (context.isSelected(context.graph.getLabelOwner(datum))) {
          return DEFAULT_CLASS_SHAPE_SELECTION_FILL_COLOR
        }
        return DEFAULT_CLASS_SHAPE_FILL_COLOR
      })
  },
  update(selection, context): void {
    const text = selection
      .selectChild<SVGTextElement>('text')
      .text(datum => datum.userObject.like.name)
      .attr('text-decoration', datum => datum.userObject.like.deprecated ? 'line-through' : 'none')
      .interrupt()
      .transition(context.transition)
      .attr('x', datum => context.graph.getAbsoluteLabelCenter(datum).x - datum.size.width / 2.0 + DEFAULT_PROPERTIES_GROUP_ICON_PADDING_LEFT + DEFAULT_PROPERTIES_GROUP_ICON_SIZE + DEFAULT_PROPERTIES_GROUP_ICON_TO_NAME_SEPARATOR_LENGTH)
      .attr('y', datum => context.graph.getAbsoluteLabelCenter(datum).y)
    selection
      .select('rect')
      .attr('x', datum => context.graph.getAbsoluteLabelCenter(datum).x - datum.size.width / 2.0 + DEFAULT_PROPERTIES_GROUP_ICON_PADDING_LEFT + DEFAULT_PROPERTIES_GROUP_ICON_SIZE + DEFAULT_PROPERTIES_GROUP_ICON_TO_NAME_SEPARATOR_LENGTH)
      .attr('y', datum => context.graph.getAbsoluteLabelCenter(datum).y - datum.size.height / 2.0)
      .attr('width', () => text.node()!.getBBox().width + DEFAULT_CLASS_SPLITTER_PADDING_RIGHT)
      .attr('height', datum => datum.size.height)
      .attr('fill', datum => {
        if (context.isSelected(datum)) {
          return DEFAULT_PROPERTIES_GROUP_SELECTION_FILL_COLOR
        }
        if (context.isSelected(context.graph.getLabelOwner(datum))) {
          return DEFAULT_CLASS_SHAPE_SELECTION_FILL_COLOR
        }
        return DEFAULT_CLASS_SHAPE_FILL_COLOR
      })
  },
}

export function createLabelRendererFactory(tooltipLayer: Layer<ViewMeta['label']>): D3DatumRendererFactory<ViewMeta, ViewMeta['label']> {
  const cl = createClassLabelMainFactory(tooltipLayer)
  const group = createPropertiesGroupLabelMainFactory(tooltipLayer)
  const leaf = createLeafPropertyLabelMainFactory(tooltipLayer)
  return ((label) => {
    switch (label.userObject.type) {
      case VIEW_TYPE_CLASS:
        return cl
      case VIEW_TYPE_PROPERTIES_GROUP:
        return group
      case VIEW_TYPE_LEAF_PROPERTY:
        return leaf
    }
  }) as D3DatumRendererFactory<ViewMeta, ViewMeta['label']>
}

export const TOOLTIP_LABEL_RENDERER_FACTORY: D3DatumRendererFactory<ViewMeta, ViewMeta['label']> = ((label) => {
  switch (label.userObject.type) {
    case VIEW_TYPE_CLASS:
      return LABEL_CLASS_OVERLAY_RENDERER
    case VIEW_TYPE_PROPERTIES_GROUP:
      return LABEL_PROPERTIES_GROUP_OVERLAY_RENDERER
    case VIEW_TYPE_LEAF_PROPERTY:
      return LABEL_LEAF_PROPERTY_OVERLAY_RENDERER
  }
}) as D3DatumRendererFactory<ViewMeta, ViewMeta['label']>