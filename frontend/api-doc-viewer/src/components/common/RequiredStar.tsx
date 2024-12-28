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

import { DiffRecord, isDiff } from '@netcracker/qubership-apihub-api-data-model'
import { Diff, DiffAction } from '@netcracker/qubership-apihub-api-diff'
import { FC, ReactNode } from 'react'
import { LayoutMode } from '../../types/LayoutMode'
import { LayoutSide } from '../../types/internal/LayoutSide'
import { getLayoutModeFlags, getLayoutSideFlags } from '../../utils/common/changes'
import { isDefined } from '../../utils/common/checkers'

type RequiredStarProps = Partial<{
  value: boolean
  valueChange: Diff | DiffRecord
  layoutMode: LayoutMode
  layoutSide: LayoutSide
}>

export const RequiredStar: FC<RequiredStarProps> = (props) => {
  const {
    value, valueChange,
    layoutMode, layoutSide,
  } = props

  const { isSideBySideDiffsLayoutMode } = getLayoutModeFlags(layoutMode)
  const { originSide, changedSide } = getLayoutSideFlags(layoutSide)

  let requiredNode: ReactNode | null = null
  const shouldDisplayInSideBySide = value === true && !isDefined(valueChange) || isDiff(valueChange) && (
    valueChange.action === DiffAction.remove && originSide ||
    valueChange.action === DiffAction.add && changedSide ||
    valueChange.action === DiffAction.replace && (
      valueChange.beforeValue === true && originSide ||
      valueChange.afterValue === true && changedSide
    )
  )
  if (
    isSideBySideDiffsLayoutMode && shouldDisplayInSideBySide ||
    !isSideBySideDiffsLayoutMode && value === true
  ) {
    requiredNode = <sup className="ml-0.5 text-red-500">*</sup>
  }
  return requiredNode
}