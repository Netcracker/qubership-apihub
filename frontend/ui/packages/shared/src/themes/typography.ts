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

import type { TypographyOptions } from '@mui/material/styles/createTypography'

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
      color: '#626D82',
    },
    subtitle3: {
      fontSize: 13,
      fontWeight: 500,
      lineHeight: '20px',
      color: '#626D82',
    },
  }
}
