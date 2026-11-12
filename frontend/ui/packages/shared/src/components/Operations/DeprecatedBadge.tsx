import type { FC } from 'react'
import { memo } from 'react'
import type { CustomChipProps } from '../CustomChip'
import { CustomChip } from '../CustomChip'
import type { SemanticChipColor } from '../semantic-chip-styles'
import { mergeChipSx, semanticChipSx } from '../semantic-chip-styles'

export const DEPRECATED_BADGE_COLOR: SemanticChipColor = {
  main: '#EF9206',
  contrastText: '#FFFFFF',
}

export const DEPRECATED_BADGE_LABEL = 'Deprecated'

export type DeprecatedBadgeProps = Omit<CustomChipProps, 'value' | 'color'>

export const DeprecatedBadge: FC<DeprecatedBadgeProps> = memo<DeprecatedBadgeProps>(({
  label = DEPRECATED_BADGE_LABEL,
  isExtraSmall = true,
  sx,
  ...props
}) => (
  <CustomChip
    {...props}
    value={DEPRECATED_BADGE_LABEL.toLowerCase()}
    label={label}
    isExtraSmall={isExtraSmall}
    sx={mergeChipSx(semanticChipSx(DEPRECATED_BADGE_COLOR), sx)}
  />
))
