import type { PaletteOptions } from '@mui/material/styles/createPalette'

import { COLOR_TEXT_SECONDARY } from './colors'

export function createPalette(): PaletteOptions {
  return {
    // Default
    background: {
      default: '#F5F5FA',
    },
    error: {
      main: '#FF5260',
    },
    primary: {
      main: '#0068FF',
    },
    secondary: {
      main: '#00BB5B',
    },
    warning: {
      main: '#FFB02E',
    },
    // Override colors of interactive UI elements for more precise mockup compliance
    action: {
      active: COLOR_TEXT_SECONDARY,
      disabled: 'rgba(98, 109, 130, 0.5)', // Corresponds to SECONDARY_TEXT_COLOR with 50% opacity
    },
  }
}

export const PAPER_SHADOW_DEFAULT =
  '0px 1px 1px rgba(4, 10, 21, 0.04), 0px 3px 14px rgba(4, 12, 29, 0.09), 0px 0px 1px rgba(7, 13, 26, 0.27)'
