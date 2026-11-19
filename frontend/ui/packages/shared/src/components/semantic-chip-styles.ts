import { alpha } from '@mui/material'
import type { SystemStyleObject } from '@mui/system'
import type { SxProps, Theme } from '@mui/material/styles'

export type SemanticChipColor = {
  main: string
  contrastText: string
}

export function semanticChipSx(
  color: SemanticChipColor | undefined,
  variant: 'filled' | 'outlined' = 'filled',
): SystemStyleObject<Theme> {
  if (!color?.main) {
    return {}
  }
  const { main, contrastText } = color
  return variant === 'outlined'
    ? {
      color: main,
      border: `1px solid ${alpha(main, 0.7)}`,
    }
    : {
      backgroundColor: main,
      color: contrastText,
    }
}

export function mergeChipSx(
  semanticSx: SystemStyleObject<Theme>,
  callerSx: SxProps<Theme> | undefined,
): SxProps<Theme> {
  return [semanticSx, ...(Array.isArray(callerSx) ? callerSx : [callerSx])]
}
