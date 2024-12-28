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

/// <reference types="vite/client"/>
/// <reference types="@emotion/react/types/css-prop"/>

import '@mui/material/styles'
import '@mui/material/Button'
import '@mui/material/Chip'
import { ComponentsProps } from '@mui/material/styles/props'
import { ComponentsOverrides } from '@mui/material/styles/overrides'
import { ComponentsVariants } from '@mui/material/styles/variants'
import { SimplePaletteColorOptions } from '@mui/material/styles/createPalette'
import { CSSProperties } from '@mui/material/styles/createTypography'
import { Theme } from '@mui/material'
import { Context } from 'react'
import { FetchErrorDetails, FetchRedirectDetails } from '../src/utils'

declare module 'react' {
  function createContext<T>(): Context<T>
}

declare module '@mui/material/styles' {
  interface PaletteOptions {
    draft: SimplePaletteColorOptions
    release: SimplePaletteColorOptions
    deprecated: SimplePaletteColorOptions
    archived: SimplePaletteColorOptions
    get: SimplePaletteColorOptions
    post: SimplePaletteColorOptions
    put: SimplePaletteColorOptions
    patch: SimplePaletteColorOptions
    query: SimplePaletteColorOptions
    mutation: SimplePaletteColorOptions
    subscription: SimplePaletteColorOptions
  }

  interface Components {
    MuiTabPanel?: {
      defaultProps?: ComponentsProps['MuiTabPanel'];
      styleOverrides?: ComponentsOverrides<Theme>['MuiTabPanel'];
      variants?: ComponentsVariants['MuiTabPanel'];
    }
  }

  interface TypographyVariants {
    subtitle3: CSSProperties
  }

  interface TypographyVariantsOptions {
    subtitle3?: CSSProperties
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    added: true
  }
}

declare module '@mui/material/Chip' {
  interface ChipPropsColorOverrides {
    draft: true
    release: true
    deprecated: true
    archived: true
    get: true
    put: true
    post: true
    patch: true
    delete: true
    query: true
    mutation: true
    subscription: true
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    subtitle3: true;
  }
}

interface CustomEventMap {
  'fetch-error': CustomEvent<FetchErrorDetails>,
  'fetch-redirect': CustomEvent<FetchRedirectDetails>
}

declare global {
  interface Window {
    scheduler: Scheduler
    TaskController: TaskController
    TaskPriorityChangeEvent: TaskPriorityChangeEvent

    addEventListener<K extends keyof CustomEventMap>(type: K, listener: (this: Document, ev: CustomEventMap[K]) => void): void

    removeEventListener<K extends keyof CustomEventMap>(type: K, listener: (this: Document, ev: CustomEventMap[K]) => void): void
  }
}

declare class Scheduler {
  constructor()

  postTask<T>(
    callback: () => T,
    options: Partial<{
      signal: AbortSignal,
      priority: Priority,
      delay: number,
    }>,
  ): Promise<T>
}

declare type Priority =
  | 'user-blocking'
  | 'user-visible'
  | 'background'

declare class TaskController extends AbortController {
  constructor(
    init: {
      priority: Priority,
    },
  )

  setPriority(
    priority: Priority,
  ): void
}

declare class TaskPriorityChangeEvent extends Event {
  constructor(
    typeArg: string,
    init: {
      previousPriority: Priority,
    },
  )
}
