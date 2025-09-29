import type { PaletteOptions, SimplePaletteColorOptions } from '@mui/material/styles/createPalette'
import type { ChipPropsColorOverrides } from '@mui/material/Chip/Chip'
import { SECONDARY_TEXT_COLOR } from './colors'

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
      active: SECONDARY_TEXT_COLOR,
      disabled: 'rgba(98, 109, 130, 0.5)', // Corresponds to SECONDARY_TEXT_COLOR with 50% opacity
    },
    ...CHIP_COLOR_OVERRIDES,
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

export const CHIP_COLOR_OVERRIDES: Record<keyof ChipPropsColorOverrides, SimplePaletteColorOptions> = {
  // ProjectStatus
  draft: {
    main: '#D6EDFF',
    contrastText: '#004EAE',
  },
  release: {
    main: '#D0FAD4',
    contrastText: '#026104',
  },
  archived: {
    main: '#F2F3F5',
    contrastText: '#0C1E36',
  },
  // OperationType
  deprecated: {
    main: '#EF9206',
    contrastText: '#FFFFFF',
  },
  // MethodType
  get: {
    main: '#6BCE70',
    contrastText: '#6BCE70',
  },
  post: {
    main: '#5CB9CC',
    contrastText: '#5CB9CC',
  },
  put: {
    main: '#F49147',
    contrastText: '#F49147',
  },
  patch: {
    main: '#FFB02E',
    contrastText: '#FFB02E',
  },
  delete: {
    main: '#FF5260',
    contrastText: '#FF5260',
  },
  // GraphQLOperationType
  query: {
    main: '#00BB5B',
    contrastText: '#00BB5B',
  },
  mutation: {
    main: '#4FC0F8',
    contrastText: '#4FC0F8',
  },
  subscription: {
    main: '#FFB02E',
    contrastText: '#FFB02E',
  },
  // Personal Access Token
  active: {
    main: '#C3F29E',
    contrastText: '#073800',
  },
  expired: {
    main: '#FFB9AB',
    contrastText: '#520100',
  },
  // Validation Ruleset Status
  rulesetSpecType: {
    main: '#D6EDFF',
    contrastText: '#004EAE',
  },
  rulesetActive: {
    main: '#D0FAD4',
    contrastText: '#026104',
  },
  rulesetInactive: {
    main: '#ECEDEF',
    contrastText: '#353C4E',
  },
}
export const DEFAULT_PAPER_SHADOW =
  '0px 1px 1px rgba(4, 10, 21, 0.04), 0px 3px 14px rgba(4, 12, 29, 0.09), 0px 0px 1px rgba(7, 13, 26, 0.27)'
