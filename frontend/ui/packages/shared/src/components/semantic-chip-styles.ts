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
