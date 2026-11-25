import { type FC, memo } from 'react'

import { CustomChip, type CustomChipProps } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import {
  mergeChipSx,
  type SemanticChipColor,
  semanticChipSx,
} from '@netcracker/qubership-apihub-ui-shared/components/semantic-chip-styles'

// The design shows the Java package in the same beige as the DDL schema chip
export const JAVA_PACKAGE_CHIP_COLOR: SemanticChipColor = {
  main: '#EAE0D5',
  contrastText: '#0C1E36',
}

export type JavaPackageChipProps = Omit<CustomChipProps, 'value' | 'color'>

export const JavaPackageChip: FC<JavaPackageChipProps> = memo<JavaPackageChipProps>(({ sx, ...props }) => (
  <CustomChip
    {...props}
    value="javaPackage"
    sx={mergeChipSx(semanticChipSx(JAVA_PACKAGE_CHIP_COLOR), sx)}
  />
))
JavaPackageChip.displayName = 'JavaPackageChip'
