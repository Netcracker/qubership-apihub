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

import { ClassView, ViewMeta } from 'main/graph/view-definition'
import { DIRTY_STATE_LAYOUT, DIRTY_STATE_VISUAL } from 'main/graph/common/dirty-state'
import { equalsClassByLayout, equalsClassByVisual } from 'main/domain/like/class'
import { DirtyStateModificationAppliersFactory } from 'main/graph/appliers-common'
import {
  DEFAULT_CLASS_HEADER_HEIGHT,
  DEFAULT_CLASS_MARGIN_LEFT,
  DEFAULT_CLASS_MARGIN_RIGHT,
  DEFAULT_CLASS_PORT_WIDTH,
  DEFAULT_CLASS_TITLE_FONT_SIZE,
  DEFAULT_CLASS_TITLE_FONT_WEIGHT, DEFAULT_CLASS_TITLE_LINE_HEIGHT,
  DEFAULT_CLASS_WIDTH,
} from 'main/defaults'
import {
  LabelViewModificationAppliers,
  LayoutGraph,
  LocatableLabel,
  LocatableNode,
  LocatablePort,
  NodeViewModificationAppliers,
  PortViewModificationAppliers,
} from 'main/graph/common/layout-graph-definition'
import { TextService } from 'main/graph/common/text-service'

export const classNodeDirtyStatusApplierFactory: DirtyStateModificationAppliersFactory<ClassView> = (update) => {
  return {
    createApplier: () => update(DIRTY_STATE_LAYOUT),
    updateApplier: (_, _2, newUserObject, oldUserObject) => {
      if (!equalsClassByLayout(newUserObject.like, oldUserObject.like)) {
        update(DIRTY_STATE_LAYOUT)
      } else if (!equalsClassByVisual(newUserObject.like, oldUserObject.like)) {
        update(DIRTY_STATE_VISUAL)
      }
    },
    removeApplier: () => update(DIRTY_STATE_LAYOUT),
  }
}

export const classLabelDirtyStatusApplierFactory: DirtyStateModificationAppliersFactory<ClassView> = (update) => {
  return {
    createApplier: () => update(DIRTY_STATE_VISUAL),
    updateApplier: () => update(DIRTY_STATE_VISUAL),
    removeApplier: () => update(DIRTY_STATE_VISUAL),
  }
}

export const classPortDirtyStatusApplierFactory: DirtyStateModificationAppliersFactory<ClassView> = (update) => {
  return {
    createApplier: () => update(DIRTY_STATE_LAYOUT),
    updateApplier: () => update(DIRTY_STATE_VISUAL),
    removeApplier: () => update(DIRTY_STATE_LAYOUT),
  }
}

function nodeSizeAndLocationApplier(graph: LayoutGraph<ViewMeta>, node: LocatableNode<ClassView>, userObject: ClassView): void {
  graph.setNodeSize(node, { width: DEFAULT_CLASS_WIDTH, height: userObject.cumulativeHeight })
}

export const classNodeSizeApplierFactory: () => NodeViewModificationAppliers<ViewMeta, ClassView> = () => ({
  createApplier: nodeSizeAndLocationApplier,
  updateApplier: nodeSizeAndLocationApplier,
})

function labelSizeAndLocationApplier(graph: LayoutGraph<ViewMeta>, label: LocatableLabel<ClassView>): void {
  const labelOwner = graph.getLabelOwner(label)
  if (graph.isNode(labelOwner)) {
    const nodeSize = graph.getNodeSize(labelOwner)
    const labelWidth = nodeSize.width - DEFAULT_CLASS_MARGIN_LEFT - DEFAULT_CLASS_MARGIN_RIGHT
    graph.setLabelSize(label, { width: labelWidth, height: DEFAULT_CLASS_TITLE_LINE_HEIGHT })
    graph.setLabelCenterRelativeToNodeCenter(label, {
      x: -nodeSize.width / 2.0 + labelWidth / 2.0 + DEFAULT_CLASS_MARGIN_LEFT,
      y: -nodeSize.height / 2.0 + DEFAULT_CLASS_HEADER_HEIGHT / 2.0,
    })
  }
}

export const classLabelSizeAndLocationApplierFactory: () => LabelViewModificationAppliers<ViewMeta, ClassView> = () => ({
  createApplier: labelSizeAndLocationApplier,
  updateApplier: labelSizeAndLocationApplier,
})

function portSizeAndLocationApplier(graph: LayoutGraph<ViewMeta>, port: LocatablePort<ClassView>): void {
  const owner = graph.getPortOwner(port)
  const nodeSize = graph.getNodeSize(owner)
  graph.setPortSize(port, { width: DEFAULT_CLASS_PORT_WIDTH, height: DEFAULT_CLASS_HEADER_HEIGHT })
  graph.setPortCenterRelativeToNodeCenter(port, {
    x: (-nodeSize.width / 2.0),
    y: (-nodeSize.height / 2.0) + (DEFAULT_CLASS_HEADER_HEIGHT / 2.0),
  })
}

export const classPortSizeAndLocationApplierFactory: () => PortViewModificationAppliers<ViewMeta, ClassView> = () => ({
  createApplier: portSizeAndLocationApplier,
  updateApplier: portSizeAndLocationApplier,
})

function labelCropApplierFactory(textService: TextService): (graph: LayoutGraph<ViewMeta>, label: LocatableLabel<ClassView>) => void {
  return (graph, label) => {
    const labelSize = graph.getLabelSize(label)
    const [croppedText] = textService.cropOneLineTextHorizontally(labelSize.width, [{
      text: label.userObject.like.name,
      fontSize: DEFAULT_CLASS_TITLE_FONT_SIZE,
      fontWeight: DEFAULT_CLASS_TITLE_FONT_WEIGHT,
      cropRatio: 1,
    }])
    label.userObject.croppedText = croppedText
  }
}

export const classLabelCropApplierFactory: (textService: TextService) => LabelViewModificationAppliers<ViewMeta, ClassView> = (textService) => ({
  createApplier: labelCropApplierFactory(textService),
  updateApplier: labelCropApplierFactory(textService),
})
