import type { TypographyOptions } from '@mui/material/styles/createTypography'
import { SECONDARY_TEXT_COLOR } from './colors'

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
    h1: {
      fontSize: 24,
      fontWeight: 400,
      color: 'black',
    },
    h2: {
      fontSize: 15,
      fontWeight: 500,
      color: 'white',
    },
    h3: {
      fontSize: 15,
      fontWeight: 600,
      color: 'black',
    },
    h5: {
      fontSize: 18,
      fontWeight: 600,
      color: 'black',
      lineHeight: '28px',
    },
    h6: {
      fontSize: 15,
      fontWeight: 400,
      color: '#353C4E',
    },
    subtitle1: {
      fontSize: 13,
      fontWeight: 600,
      color: 'black',
    },
    subtitle2: {
      fontSize: 12,
      fontWeight: 400,
      color: SECONDARY_TEXT_COLOR,
    },
    subtitle3: {
      fontSize: 13,
      fontWeight: 500,
      lineHeight: '20px',
      color: SECONDARY_TEXT_COLOR,
    },
    subtitle4: {
      fontSize: 13,
      fontWeight: 500,
      lineHeight: '20px',
    },
  }
}
