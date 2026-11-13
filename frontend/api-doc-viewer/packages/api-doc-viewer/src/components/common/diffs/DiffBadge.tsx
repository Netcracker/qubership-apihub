import { cn } from '@apihub/utils/common/cn'
import { Diff, DiffAction } from "@netcracker/qubership-apihub-api-diff"
import { FC } from 'react'
import { BLOCK_CONTENT_DIFF_COLOR_MAP, DEFAULT_MUTED_VALUE_CLASS } from '../../../consts/changes'
import { useChangeSeverityFilters } from '../../../contexts/ChangeSeverityFiltersContext'
import { LayoutSide } from '../../../types/internal/LayoutSide'
import { LayoutMode } from '../../../types/LayoutMode'
import { getLayoutModeFlags, getLayoutSideFlags, isDiffTypeIncluded } from '../../../utils/common/changes'
import { getUxBadgeColorSchema } from '../../kit/ux/UxBadge/consts'
import { BADGE_KIND_DEFAULT } from '../../kit/ux/UxBadge/types'
import { UxBadge } from '../../kit/ux/UxBadge/UxBadge'

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
    colorSchema = getUxBadgeColorSchema(BADGE_KIND_DEFAULT),
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
    return <UxBadge text={label} colorSchema={colorSchema} />
  }

  const diffAction = $changes!.action
  const diffColorSchema = isNodeOrContentChanged
    ? `${getUxBadgeColorSchema(BADGE_KIND_DEFAULT)} ${BLOCK_CONTENT_DIFF_COLOR_MAP[diffAction]}`
    : undefined

  const removedRule = diffAction === DiffAction.remove && (isInlineDiffsLayoutMode || originSide)
  const addedRule = diffAction === DiffAction.add && (isInlineDiffsLayoutMode || changedSide)

  if (!diffTypeIncluded) {
    return removedRule || addedRule
      ? <UxBadge text={label} colorSchema={getUxBadgeColorSchema(BADGE_KIND_DEFAULT)} />
      : null
  }

  if (removedRule) {
    return (
      <UxBadge
        text={<span className={cn(DEFAULT_MUTED_VALUE_CLASS)}>{label}</span>}
        colorSchema={diffColorSchema}
      />
    )
  }
  if (addedRule) {
    return <UxBadge text={label} colorSchema={diffColorSchema} />
  }

  return null
}