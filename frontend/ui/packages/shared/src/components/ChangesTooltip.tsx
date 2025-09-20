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

import type { FC, PropsWithChildren } from 'react'
import { memo } from 'react'
import type { ChangeSeverity } from '../entities/change-severities'
import {
  CHANGE_SEVERITY_COLOR_MAP,
  CHANGE_SEVERITY_DESCRIPTION_MAP,
  CHANGE_SEVERITY_TOOLTIP_TITLE_MAP,
} from '../entities/change-severities'
import { MarkerTooltip } from './MarkerTooltip'

export type ChangesTooltipProps = PropsWithChildren<{
  changeType: ChangeSeverity
  disableHoverListener?: boolean
  category?: ChangesTooltipCategory
}>

export const ChangesTooltip: FC<ChangesTooltipProps> = memo<ChangesTooltipProps>(props => {
  const {
    children,
    changeType,
    disableHoverListener = false,
    category,
  } = props

  return (
    <MarkerTooltip<ChangeSeverity, ChangesTooltipCategory>
      disableHoverListener={disableHoverListener}
      variant={changeType}
      variantToDescription={CHANGE_SEVERITY_DESCRIPTION_MAP}
      variantToTooltipTitle={CHANGE_SEVERITY_TOOLTIP_TITLE_MAP}
      variantToColor={CHANGE_SEVERITY_COLOR_MAP}
      category={category}
      categoryToTooltipTitle={TOOLTIP_TITLE_BY_CATEGORY}
    >
      {children}
    </MarkerTooltip>
  )
})

export const CATEGORY_OPERATION = 'operation'
export const CATEGORY_PACKAGE = 'packages'

const TOOLTIP_TITLE_BY_CATEGORY = {
  [CATEGORY_OPERATION]: 'Operations',
  [CATEGORY_PACKAGE]: 'Packages',
}

export type ChangesTooltipCategory =
  | typeof CATEGORY_OPERATION
  | typeof CATEGORY_PACKAGE
