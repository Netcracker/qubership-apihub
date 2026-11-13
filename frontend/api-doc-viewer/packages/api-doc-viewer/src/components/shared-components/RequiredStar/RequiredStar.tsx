import { cn } from "@apihub/utils/common/cn"
import { DiffRecord, isDiff } from "@netcracker/qubership-apihub-api-data-model"
import { Diff, DiffAction } from "@netcracker/qubership-apihub-api-diff"
import { FC, ReactNode } from "react"
import { LayoutMode } from "@apihub/types/LayoutMode"
import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { getLayoutModeFlags, getLayoutSideFlags } from "@apihub/utils/common/changes"
import { isDefined } from "@apihub/utils/common/checkers"

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
    requiredNode = <sup className={cn("ml-0.5 text-red-500")}>*</sup>
  }
  return requiredNode
}
