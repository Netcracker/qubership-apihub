import type { Theme } from '@mui/material/styles'
import type { SystemStyleObject } from '@mui/system/styleFunctionSx/styleFunctionSx'

export function cutViewPortStyleCalculator(
  theme: Theme,
  heightCut: number,
): SystemStyleObject<Theme> {
  return {
    height: `calc(100vh - ${theme.mixins.toolbar.minHeight}px - ${heightCut}px)`,
  }
}
