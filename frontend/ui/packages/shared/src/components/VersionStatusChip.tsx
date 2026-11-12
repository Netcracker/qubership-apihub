import type { FC } from 'react'
import { memo } from 'react'
import type { CustomChipProps } from './CustomChip'
import { CustomChip } from './CustomChip'
import type { SemanticChipColor } from './semantic-chip-styles'
import { mergeChipSx, semanticChipSx } from './semantic-chip-styles'
import type { VersionStatus } from '../entities/version-status'
import { DRAFT_VERSION_STATUS, RELEASE_VERSION_STATUS } from '../entities/version-status'

export const VERSION_STATUS_CHIP_COLORS: Record<VersionStatus, SemanticChipColor> = {
  [DRAFT_VERSION_STATUS]: {
    main: '#D6EDFF',
    contrastText: '#004EAE',
  },
  [RELEASE_VERSION_STATUS]: {
    main: '#D0FAD4',
    contrastText: '#026104',
  },
}

export type VersionStatusChipProps = {
  status: VersionStatus
} & Omit<CustomChipProps, 'value' | 'color'>

export const VersionStatusChip: FC<VersionStatusChipProps> = memo<VersionStatusChipProps>(({
  status,
  sx,
  variant,
  ...props
}) => (
  <CustomChip
    {...props}
    variant={variant}
    value={status}
    sx={mergeChipSx(semanticChipSx(VERSION_STATUS_CHIP_COLORS[status], variant === 'outlined' ? 'outlined' : 'filled'), sx)}
  />
))
