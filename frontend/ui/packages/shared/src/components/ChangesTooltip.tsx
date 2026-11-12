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
export const CATEGORY_TABLE = 'table'

const TOOLTIP_TITLE_BY_CATEGORY = {
  [CATEGORY_OPERATION]: 'Operations',
  [CATEGORY_PACKAGE]: 'Packages',
  [CATEGORY_TABLE]: 'Tables',
}

export type ChangesTooltipCategory =
  | typeof CATEGORY_OPERATION
  | typeof CATEGORY_PACKAGE
  | typeof CATEGORY_TABLE
