import { cn } from '@apihub/utils/common/cn'
import { DiffRecord, isDiff } from '@netcracker/qubership-apihub-api-data-model'
import { Diff, DiffAction } from '@netcracker/qubership-apihub-api-diff'
import { FC, ReactNode } from 'react'
import { LayoutSide } from '../../types/internal/LayoutSide'
import { LayoutMode } from '../../types/LayoutMode'
import { getLayoutModeFlags, getLayoutSideFlags } from '../../utils/common/changes'
import { isDefined } from '../../utils/common/checkers'

type NullableAsteriskProps = Partial<{
  value: boolean
  valueChange: Diff | DiffRecord
  layoutMode: LayoutMode
  layoutSide: LayoutSide
}>

export const NullableAsterisk: FC<NullableAsteriskProps> = (props) => {
  const {
    value, valueChange,
    layoutMode, layoutSide,
  } = props

  const { isSideBySideDiffsLayoutMode } = getLayoutModeFlags(layoutMode)
  const { originSide, changedSide } = getLayoutSideFlags(layoutSide)

  let notNullableNode: ReactNode | null = null
  const shouldDisplayInSideBySide = value === false && !isDefined(valueChange) || isDiff(valueChange) && (
    valueChange.action === DiffAction.replace && (
      valueChange.beforeValue === false && originSide ||
      valueChange.afterValue === false && changedSide
    )
  )
  if (
    isSideBySideDiffsLayoutMode && shouldDisplayInSideBySide ||
    !isSideBySideDiffsLayoutMode && value === false
  ) {
    notNullableNode = <sup className={cn("ml-0.5 text-red-500")}>*</sup>
  }
  return notNullableNode
}