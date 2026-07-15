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

import { DiffRecord } from '@netcracker/qubership-apihub-api-data-model'
import { Diff } from '@netcracker/qubership-apihub-api-diff'
import { DiffsClassesBuilder } from '@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities'
import { HighlightVariant } from '@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface'
import type { FC } from 'react'
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from '../../types/internal/LayoutSide'
import { LayoutMode } from '../../types/LayoutMode'
import { NodeTitleData } from '../../types/NodeTitleData'
import { diffRename } from '../../utils/common/changes'
import { BADGE_KIND_INFO } from "../kit/ux/UxBadge/types"
import { UxBadge } from '../kit/ux/UxBadge/UxBadge'
import { NullableAsterisk } from './NullableAsterisk'
import { RequiredStar } from './RequiredStar'

export type NodeTitleProps = NodeTitleData & {
  // control flags
  showRequired?: boolean
  showNullable?: boolean
  // diffs
  layoutMode?: LayoutMode
  layoutSide?: LayoutSide
  requiredChange?: Diff | DiffRecord
  nullableChange?: Diff | DiffRecord
  titleChange?: Diff
}

export const NodeTitle: FC<NodeTitleProps> = (props) => {
  const {
    required,
    nullable,
    isBadge,
    badgeKind = BADGE_KIND_INFO,
    isIndex,
    isDirective,
    // control flags
    showRequired = false,
    showNullable = false,
    // diffs
    layoutMode,
    layoutSide,
    requiredChange,
    nullableChange,
    titleChange,
  } = props

  let { title } = props

  let isRenamed = false
  if (diffRename(titleChange)) {
    isRenamed = true
    if (layoutSide === ORIGIN_LAYOUT_SIDE) {
      title = `${titleChange.beforeKey}`
    }
    if (layoutSide === CHANGED_LAYOUT_SIDE) {
      title = `${titleChange.afterKey}`
    }
  }

  let titleNode
  if (isBadge) {
    titleNode = <UxBadge kind={badgeKind} text={title} inline={true} />
  } else if (isIndex) {
    title = `[${title}]`
  } else if (isDirective) {
    title = `@${title}`
  }
  if (!titleNode) {
    titleNode = isRenamed
      ? <span className={DiffsClassesBuilder.highlighter(HighlightVariant.Yellow)}>{title}</span>
      : <>{title}</>
  }

  return (
    <div className="inline">
      {titleNode}
      {showRequired && (
        <RequiredStar
          value={required ?? false}
          valueChange={requiredChange}
          layoutMode={layoutMode}
          layoutSide={layoutSide}
        />
      )}
      {showNullable && (
        <NullableAsterisk
          value={nullable ?? true}
          valueChange={nullableChange}
          layoutMode={layoutMode}
          layoutSide={layoutSide}
        />
      )}
    </div>
  )
}
