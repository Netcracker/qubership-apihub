/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { PaletteOptions, SimplePaletteColorOptions } from '@mui/material/styles/createPalette'
import type { ChipPropsColorOverrides } from '@mui/material/Chip/Chip'

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
    ...CHIP_COLOR_OVERRIDES,
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
}
export const DEFAULT_PAPER_SHADOW =
  '0px 1px 1px rgba(4, 10, 21, 0.04), 0px 3px 14px rgba(4, 12, 29, 0.09), 0px 0px 1px rgba(7, 13, 26, 0.27)'
