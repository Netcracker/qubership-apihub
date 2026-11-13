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

export type BadgeWithDiffsProps = {
  label: string
  colorSchema?: string
  /** Classes kept in every look, the diff look included (e.g. a font size); `colorSchema` is replaced there. */
  sizeClassName?: string
  layoutMode: LayoutMode
  layoutSide: LayoutSide
  diff?: Diff
}

export const BadgeWithDiffs: FC<BadgeWithDiffsProps> = (props) => {
  const {
    label,
    colorSchema = getUxBadgeColorSchema(BADGE_KIND_DEFAULT),
    sizeClassName,
    layoutMode,
    layoutSide,
    diff,
  } = props

  const filters = useChangeSeverityFilters()
  const diffType = diff?.type
  const diffTypeIncluded = isDiffTypeIncluded(diffType, filters)

  const { isDocumentLayoutMode, isInlineDiffsLayoutMode } = getLayoutModeFlags(layoutMode)
  const { originSide, changedSide } = getLayoutSideFlags(layoutSide)

  const propertyChanged = !isDocumentLayoutMode && !!diff
  const withSize = (classes: string): string => (sizeClassName ? `${classes} ${sizeClassName}` : classes)

  if (!propertyChanged) {
    return <UxBadge text={label} colorSchema={withSize(colorSchema)} />
  }

  const diffAction = diff!.action
  const diffColorSchema = withSize(`${getUxBadgeColorSchema(BADGE_KIND_DEFAULT)} ${BLOCK_CONTENT_DIFF_COLOR_MAP[diffAction]}`)

  const removedRule = diffAction === DiffAction.remove && (isInlineDiffsLayoutMode || originSide)
  const addedRule = diffAction === DiffAction.add && (isInlineDiffsLayoutMode || changedSide)

  if (!diffTypeIncluded) {
    return removedRule || addedRule
      ? <UxBadge text={label} colorSchema={withSize(getUxBadgeColorSchema(BADGE_KIND_DEFAULT))} />
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
