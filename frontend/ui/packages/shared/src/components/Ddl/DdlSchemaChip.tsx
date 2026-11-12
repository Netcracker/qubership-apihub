import type { FC } from 'react'
import { memo } from 'react'
import type { CustomChipProps } from '../CustomChip'
import { CustomChip } from '../CustomChip'
import type { SemanticChipColor } from '../semantic-chip-styles'
import { mergeChipSx, semanticChipSx } from '../semantic-chip-styles'

export const DDL_SCHEMA_CHIP_COLOR: SemanticChipColor = {
  main: '#EAE0D5',
  contrastText: '#0C1E36',
}

export type DdlSchemaChipProps = Omit<CustomChipProps, 'value' | 'color'>

export const DdlSchemaChip: FC<DdlSchemaChipProps> = memo<DdlSchemaChipProps>(({
  sx,
  ...props
}) => (
  <CustomChip
    {...props}
    value="ddlSchema"
    sx={mergeChipSx(semanticChipSx(DDL_SCHEMA_CHIP_COLOR), sx)}
  />
))
