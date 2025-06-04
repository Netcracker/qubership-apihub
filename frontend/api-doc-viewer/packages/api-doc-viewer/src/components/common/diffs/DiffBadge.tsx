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

import { Diff, DiffAction } from "@netcracker/qubership-apihub-api-diff"
import { FC } from 'react'
import { BLOCK_CONTENT_DIFF_COLOR_MAP, DEFAULT_STRIKETHROUGH_VALUE_CLASS } from '../../../consts/changes'
import { useChangeSeverityFilters } from '../../../contexts/ChangeSeverityFiltersContext'
import { LayoutSide } from '../../../types/internal/LayoutSide'
import { LayoutMode } from '../../../types/LayoutMode'
import { getLayoutModeFlags, getLayoutSideFlags, isDiffTypeIncluded } from '../../../utils/common/changes'
import { COLOR_SCHEMAS } from '../../kit/ux/consts'
import { BADGE_KIND_DEFAULT } from '../../kit/ux/types'
import { UxBadge } from '../../kit/ux/UxBadge'

type DiffBadgeProps = {
  label: string
  colorSchema?: string
  layoutMode: LayoutMode
  layoutSide: LayoutSide
  isNodeChanged: boolean
  isContentChanged: boolean
  $changes?: Diff
}

export const DiffBadge: FC<DiffBadgeProps> = (props) => {
  const {
    label,
    colorSchema = COLOR_SCHEMAS[BADGE_KIND_DEFAULT],
    layoutMode,
    layoutSide,
    isNodeChanged,
    isContentChanged,
    $changes,
  } = props

  const filters = useChangeSeverityFilters()
  const diffType = $changes?.type
  const diffTypeIncluded = isDiffTypeIncluded(diffType, filters)

  const { isDocumentLayoutMode, isInlineDiffsLayoutMode } = getLayoutModeFlags(layoutMode)
  const { originSide, changedSide } = getLayoutSideFlags(layoutSide)
  const isNodeOrContentChanged = isNodeChanged || isContentChanged

  const propertyChanged = !isDocumentLayoutMode && isNodeOrContentChanged && !!$changes

  if (!propertyChanged) {
    return <UxBadge text={label} colorSchema={colorSchema}/>
  }

  const diffAction = $changes!.action
  const diffColorSchema = isNodeOrContentChanged
    ? `${COLOR_SCHEMAS[BADGE_KIND_DEFAULT]} ${BLOCK_CONTENT_DIFF_COLOR_MAP[diffAction]}`
    : undefined

  const removedRule = diffAction === DiffAction.remove && (isInlineDiffsLayoutMode || originSide)
  const addedRule = diffAction === DiffAction.add && (isInlineDiffsLayoutMode || changedSide)

  if (!diffTypeIncluded) {
    return removedRule || addedRule
      ? <UxBadge text={label} colorSchema={COLOR_SCHEMAS[BADGE_KIND_DEFAULT]}/>
      : null
  } else {
    if (removedRule) {
      return (
        <UxBadge
          text={<span className={DEFAULT_STRIKETHROUGH_VALUE_CLASS}>{label}</span>}
          colorSchema={diffColorSchema}
        />
      )
    }
    if (addedRule) {
      return <UxBadge text={label} colorSchema={diffColorSchema}/>
    }
  }
  return null
}