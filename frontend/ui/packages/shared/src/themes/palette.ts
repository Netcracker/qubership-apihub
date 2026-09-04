import type { PaletteOptions } from '@mui/material/styles/createPalette'
import { DEFAULT_TEXT_COLOR, SECONDARY_TEXT_COLOR } from './colors'

export function createPalette(): PaletteOptions {
  return {
    // Default
    background: {
      default: '#F5F5FA',
    },
    text: {
      primary: DEFAULT_TEXT_COLOR,
      secondary: SECONDARY_TEXT_COLOR,
    },
    error: {
      main: '#FF5260',
      light: '#FFEAE9',
    },
    primary: {
      main: '#0068FF',
      light: '#E1F0FE',
      dark: '#0052EE',
    },
    secondary: {
      main: '#00BB5B',
      light: '#D0FAD4',
    },
    warning: {
      main: '#FFB02E',
      light: '#FFF4CC',
    },
    // Override colors of interactive UI elements for more precise mockup compliance
    action: {
      active: SECONDARY_TEXT_COLOR,
      disabled: 'rgba(98, 109, 130, 0.5)', // Corresponds to SECONDARY_TEXT_COLOR with 50% opacity
    },
    ...{
      hint: {
        main: '#B4BFCF',
      },
      information: { // because 'info' is already taken by MUI
        main: '#61AAF2',
      },
    },
  }
}

export const DEFAULT_PAPER_SHADOW =
  '0px 1px 1px rgba(4, 10, 21, 0.04), 0px 3px 14px rgba(4, 12, 29, 0.09), 0px 0px 1px rgba(7, 13, 26, 0.27)'
