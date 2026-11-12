import { LocatablePort } from 'main/graph/common/layout-graph-definition'
import {
  ClassView,
  LeafPropertyView,
  PropertiesGroupView,
  VIEW_TYPE_LEAF_PROPERTY,
  VIEW_TYPE_PROPERTIES_GROUP,
  ViewMeta,
} from 'main/graph/view-definition'
import { D3DatumRenderer, D3DatumRendererFactory } from 'main/graph/common/d3-layout-graph-component-definitions'
import { Color } from 'main/domain'
import {
  DEFAULT_INCLUDE_PROPERTIES_GROUP_RELATION_SELECTION_STROKE_COLOR,
  DEFAULT_INCLUDE_PROPERTIES_GROUP_RELATION_STROKE_COLOR,
  DEFAULT_PROPERTY_TO_CLASS_RELATION_SELECTION_STROKE_COLOR,
  DEFAULT_PROPERTY_TO_CLASS_RELATION_STROKE_COLOR,
} from 'main/defaults'

const VOID_PORT_STYLER: D3DatumRenderer<ViewMeta, LocatablePort<ClassView>> & D3DatumRenderer<ViewMeta, LocatablePort<PropertiesGroupView>> = {
  id: 'void-port',
  create(): void {},
  update(): void {},
}

function propertyPortRendererFactory(
  id: string,
  mainColor: Color, selectionColor: Color,
): D3DatumRenderer<ViewMeta, LocatablePort<LeafPropertyView> | LocatablePort<PropertiesGroupView>> {
  return {
    id,
    create(selection, context): void {
      selection.append('circle')
        .attr('cx', datum => datum.selfCenterRelativeToNodeCenter.x)
        .attr('cy', datum => datum.selfCenterRelativeToNodeCenter.y)
        .attr('r', datum => datum.size.width / 2.0)
        .attr('fill', datum => context.isSelected(datum) ? selectionColor : mainColor)
      selection
        .attr('opacity', 0)
        .interrupt()
        .transition(context.transition)
        .attr('opacity', 1)
    },
    update(selection, context): void {
      selection.select('circle')
        .attr('fill', datum => context.isSelected(datum) ? selectionColor : mainColor)
        .interrupt()
        .transition(context.transition)
        .attr('r', datum => datum.size.width / 2.0)
        .attr('cx', datum => datum.selfCenterRelativeToNodeCenter.x)
        .attr('cy', datum => datum.selfCenterRelativeToNodeCenter.y)
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

const LEAF_PROPERTY_RENDERER = propertyPortRendererFactory('leaf-property-port', DEFAULT_PROPERTY_TO_CLASS_RELATION_STROKE_COLOR, DEFAULT_PROPERTY_TO_CLASS_RELATION_SELECTION_STROKE_COLOR)
const PROPERTIES_GROUP_RENDERER = propertyPortRendererFactory('properties-group-port', DEFAULT_INCLUDE_PROPERTIES_GROUP_RELATION_STROKE_COLOR, DEFAULT_INCLUDE_PROPERTIES_GROUP_RELATION_SELECTION_STROKE_COLOR)
export const PORT_RENDERER_FACTORY: D3DatumRendererFactory<ViewMeta, ViewMeta['port']> = ((port) => {
  switch (port.userObject.type) {
    case VIEW_TYPE_LEAF_PROPERTY: {
      return LEAF_PROPERTY_RENDERER
    }
    case VIEW_TYPE_PROPERTIES_GROUP: {
      return PROPERTIES_GROUP_RENDERER
    }
  }
  return VOID_PORT_STYLER
}) as D3DatumRendererFactory<ViewMeta, ViewMeta['port']>

