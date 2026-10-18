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

import { PropertiesGroupView, ViewMeta } from 'main/graph/view-definition'
import { DIRTY_STATE_LAYOUT, DIRTY_STATE_VISUAL } from 'main/graph/common/dirty-state'
import { DirtyStateModificationAppliersFactory } from 'main/graph/appliers-common'
import {
  DEFAULT_PROPERTIES_GROUP_FONT_SIZE,
  DEFAULT_PROPERTIES_GROUP_FONT_WEIGHT,
  DEFAULT_PROPERTIES_GROUP_ICON_PADDING_LEFT,
  DEFAULT_PROPERTIES_GROUP_ICON_SIZE,
  DEFAULT_PROPERTIES_GROUP_ICON_TO_NAME_SEPARATOR_LENGTH,
  DEFAULT_PROPERTIES_GROUP_PORT_WIDTH,
  DEFAULT_PROPERTIES_GROUP_TITLE_HEIGHT,
  DEFAULT_PROPERTIES_GROUP_TITLE_PADDING_RIGHT,
} from 'main/defaults'
import {
  LabelViewModificationAppliers,
  LayoutGraph,
  LocatableLabel,
  LocatablePort,
  PortViewModificationAppliers,
} from 'main/graph/common/layout-graph-definition'
import { equalsPropertiesGroupByLayout, equalsPropertiesGroupByVisual } from 'main/domain/like/properties-group'
import { TextService } from 'main/graph/common/text-service'

export const propertiesGroupLabelDirtyStatusApplierFactory: DirtyStateModificationAppliersFactory<PropertiesGroupView> = (update) => {
  return {
    createApplier: () => update(DIRTY_STATE_LAYOUT),
    updateApplier: (_, _2, newUserObject, oldUserObject) => {
      if (!equalsPropertiesGroupByLayout(newUserObject.like, oldUserObject.like)) {
        update(DIRTY_STATE_LAYOUT)
      }
      if (!equalsPropertiesGroupByVisual(newUserObject.like, oldUserObject.like)) {
        update(DIRTY_STATE_VISUAL)
      }
    },
    removeApplier: () => update(DIRTY_STATE_LAYOUT),
  }
}

export const propertiesGroupPortDirtyStatusApplierFactory: DirtyStateModificationAppliersFactory<PropertiesGroupView> = (update) => {
  return {
    createApplier: () => update(DIRTY_STATE_LAYOUT),
    //todo port reordering should provide DIRTY_STATE_LAYOUT
    updateApplier: () => update(DIRTY_STATE_VISUAL),
    removeApplier: () => update(DIRTY_STATE_LAYOUT),
  }
}

function labelSizeAndLocationApplier(graph: LayoutGraph<ViewMeta>, label: LocatableLabel<PropertiesGroupView>, userObject: PropertiesGroupView): void {
  const labelOwner = graph.getLabelOwner(label)
  if (graph.isNode(labelOwner)) {
    const nodeSize = graph.getNodeSize(labelOwner)
    graph.setLabelSize(label, { width: nodeSize.width, height: DEFAULT_PROPERTIES_GROUP_TITLE_HEIGHT })
    graph.setLabelCenterRelativeToNodeCenter(label, {
      x: 0,
      y: -nodeSize.height / 2 + userObject.cumulativeOffsetToCenter,
    })
  }
}

export const propertiesGroupLabelSizeAndPositionApplierFactory: () => LabelViewModificationAppliers<ViewMeta, PropertiesGroupView> = () => ({
  createApplier: labelSizeAndLocationApplier,
  updateApplier: labelSizeAndLocationApplier,
})

function portSizeAndLocationApplier(graph: LayoutGraph<ViewMeta>, port: LocatablePort<PropertiesGroupView>, userObject: PropertiesGroupView): void {
  const nodeSize = graph.getNodeSize(graph.getPortOwner(port))
  graph.setPortSize(port, {
    width: DEFAULT_PROPERTIES_GROUP_PORT_WIDTH,
    height: DEFAULT_PROPERTIES_GROUP_TITLE_HEIGHT,
  })
  graph.setPortCenterRelativeToNodeCenter(port, {
    x: nodeSize.width / 2,
    y: -nodeSize.height / 2 + userObject.cumulativeOffsetToCenter,
  })
}

export const propertiesGroupPortSizeAndLocationApplierFactory: () => PortViewModificationAppliers<ViewMeta, PropertiesGroupView> = () => ({
  createApplier: portSizeAndLocationApplier,
  updateApplier: portSizeAndLocationApplier,
})

function labelCropApplierFactory(textService: TextService): (graph: LayoutGraph<ViewMeta>, label: LocatableLabel<PropertiesGroupView>) => void {
  return (graph, label) => {
    const labelSize = graph.getLabelSize(label)
    const [croppedText] = textService.cropOneLineTextHorizontally(labelSize.width - DEFAULT_PROPERTIES_GROUP_ICON_PADDING_LEFT - DEFAULT_PROPERTIES_GROUP_ICON_SIZE - DEFAULT_PROPERTIES_GROUP_ICON_TO_NAME_SEPARATOR_LENGTH - DEFAULT_PROPERTIES_GROUP_TITLE_PADDING_RIGHT, [{
      text: label.userObject.like.name,
      fontSize: DEFAULT_PROPERTIES_GROUP_FONT_SIZE,
      fontWeight: DEFAULT_PROPERTIES_GROUP_FONT_WEIGHT,
      cropRatio: 1,
    }])
    label.userObject.croppedText = croppedText
  }
}

export const propertiesGroupLabelCropApplierFactory: (textService: TextService) => LabelViewModificationAppliers<ViewMeta, PropertiesGroupView> = (textService) => ({
  createApplier: labelCropApplierFactory(textService),
  updateApplier: labelCropApplierFactory(textService),
})