import type { TypographyOptions } from '@mui/material/styles/createTypography'

import { COLOR_TEXT_SECONDARY } from './colors'

export function createTypography(): TypographyOptions {
  return {
    fontFamily: 'Inter',
    body2: {
      fontSize: 13,
      fontWeight: 400,
      color: 'black',
    },
    button: {
      fontSize: 13,
      fontWeight: 500,
      textTransform: 'none',
    },
    subtitle1: {
      fontSize: 13,
      fontWeight: 600,
      color: 'black',
    },
    subtitle2: {
      fontSize: 12,
      fontWeight: 400,
      color: COLOR_TEXT_SECONDARY,
    },
  }
}
