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

import { LeafPropertyView, ViewMeta } from 'main/graph/view-definition'
import { DIRTY_STATE_LAYOUT, DIRTY_STATE_VISUAL } from 'main/graph/common/dirty-state'
import { DirtyStateModificationAppliersFactory } from 'main/graph/appliers-common'
import { equalsLeafPropertyByLayout, equalsLeafPropertyByVisual } from 'main/domain/like/leaf-property'
import {
  DEFAULT_CLASS_MARGIN_LEFT,
  DEFAULT_LEAF_PROPERTY_FONT_SIZE,
  DEFAULT_LEAF_PROPERTY_FONT_WEIGHT,
  DEFAULT_LEAF_PROPERTY_LINE_HEIGHT,
  DEFAULT_LEAF_PROPERTY_PORT_WIDTH,
} from 'main/defaults'
import {
  LabelViewModificationAppliers,
  LayoutGraph,
  LocatableLabel,
  LocatablePort,
  PortViewModificationAppliers,
} from 'main/graph/common/layout-graph-definition'
import { TextService } from 'main/graph/common/text-service'

export const leafPropertyLabelDirtyStatusApplierFactory: DirtyStateModificationAppliersFactory<LeafPropertyView> = (update) => {
  return {
    createApplier: () => update(DIRTY_STATE_LAYOUT),
    updateApplier: (_, _2, newUserObject, oldUserObject) => {
      if (!equalsLeafPropertyByLayout(newUserObject.like, oldUserObject.like)) {
        update(DIRTY_STATE_LAYOUT)
      }
      if (!equalsLeafPropertyByVisual(newUserObject.like, oldUserObject.like)) {
        update(DIRTY_STATE_VISUAL)
      }
    },
    removeApplier: () => update(DIRTY_STATE_LAYOUT),
  }
}

export const leafPropertyPortDirtyStatusApplierFactory: DirtyStateModificationAppliersFactory<LeafPropertyView> = (update) => {
  return {
    createApplier: () => update(DIRTY_STATE_LAYOUT),
    //todo port reordering should provide DIRTY_STATE_LAYOUT
    updateApplier: () => update(DIRTY_STATE_VISUAL),
    removeApplier: () => update(DIRTY_STATE_LAYOUT),
  }
}

function labelSizeAndLocationApplier(graph: LayoutGraph<ViewMeta>, label: LocatableLabel<LeafPropertyView>, userObject: LeafPropertyView): void {
  const labelOwner = graph.getLabelOwner(label)
  if (graph.isNode(labelOwner)) {
    const nodeSize = graph.getNodeSize(labelOwner)
    graph.setLabelSize(label, { width: nodeSize.width, height: DEFAULT_LEAF_PROPERTY_LINE_HEIGHT })
    graph.setLabelCenterRelativeToNodeCenter(label, {
      x: 0,
      y: -nodeSize.height / 2 + userObject.cumulativeOffsetToCenter,
    })
  }
}

export const leafPropertyLabelSizeAndLocationApplierFactory: () => LabelViewModificationAppliers<ViewMeta, LeafPropertyView> = () => ({
  createApplier: labelSizeAndLocationApplier,
  updateApplier: labelSizeAndLocationApplier,
})

function portSizeAndLocationApplier(graph: LayoutGraph<ViewMeta>, port: LocatablePort<LeafPropertyView>, userObject: LeafPropertyView): void {
  const nodeSize = graph.getNodeSize(graph.getPortOwner(port))
  graph.setPortSize(port, { width: DEFAULT_LEAF_PROPERTY_PORT_WIDTH, height: DEFAULT_LEAF_PROPERTY_LINE_HEIGHT })
  graph.setPortCenterRelativeToNodeCenter(port, {
    x: nodeSize.width / 2.0,
    y: -nodeSize.height / 2.0 + userObject.cumulativeOffsetToCenter,
  })
}

export const leafPropertyPortSizeAndLocationApplierFactory: () => PortViewModificationAppliers<ViewMeta, LeafPropertyView> = () => ({
  createApplier: portSizeAndLocationApplier,
  updateApplier: portSizeAndLocationApplier,
})

function labelCropApplierFactory(textService: TextService): (graph: LayoutGraph<ViewMeta>, label: LocatableLabel<LeafPropertyView>) => void {
  return (graph, label) => {
    const labelSize = graph.getLabelSize(label)
    const [croppedName, croppedRequired, croppedType] = textService.cropOneLineTextHorizontally(labelSize.width - DEFAULT_CLASS_MARGIN_LEFT - DEFAULT_CLASS_MARGIN_LEFT, [
      {
        text: label.userObject.like.name,
        fontSize: DEFAULT_LEAF_PROPERTY_FONT_SIZE,
        fontWeight: DEFAULT_LEAF_PROPERTY_FONT_WEIGHT,
        cropRatio: 0.5,
      },
      {
        text: label.userObject.requiredCharacter,
        fontSize: DEFAULT_LEAF_PROPERTY_FONT_SIZE,
        fontWeight: DEFAULT_LEAF_PROPERTY_FONT_WEIGHT,
      },
      {
        text: label.userObject.like.propertyType,
        fontSize: DEFAULT_LEAF_PROPERTY_FONT_SIZE,
        fontWeight: DEFAULT_LEAF_PROPERTY_FONT_WEIGHT,
        cropRatio: 0.5,
      },
    ])
    label.userObject.croppedName = croppedName
    label.userObject.croppedRequiredCharacter = croppedRequired
    label.userObject.croppedType = croppedType
  }
}

export const leafPropertyLabelCropApplierFactory: (textService: TextService) => LabelViewModificationAppliers<ViewMeta, LeafPropertyView> = (textService) => ({
  createApplier: labelCropApplierFactory(textService),
  updateApplier: labelCropApplierFactory(textService),
})