/// <reference types="vite/client"/>
/// <reference types="@emotion/react/types/css-prop"/>

import '@mui/material/styles'
import '@mui/material/Button'
import '@mui/material/Chip'
import { ComponentsProps } from '@mui/material/styles/props'
import { ComponentsOverrides } from '@mui/material/styles/overrides'
import { ComponentsVariants } from '@mui/material/styles/variants'
import { CSSProperties } from '@mui/material/styles/createTypography'
import { Theme } from '@mui/material'
import { Context } from 'react'
import { FetchErrorDetails, FetchRedirectDetails } from '../src/utils'
import type { SystemConfigurationDto } from './types/system-configuration'

declare module 'react' {
  function createContext<T>(): Context<T>
}

declare module '@mui/material/styles' {
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
    subtitle4?: CSSProperties
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    added: true
  }
}

declare module '@mui/material/Chip' {
  interface ChipPropsVariantOverrides {
    readonly: true
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    subtitle3: true;
    subtitle4: true;
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

  interface WorkerGlobalScope {
    lastIdentityProviderId: string | undefined | null
    systemConfigurationDto: SystemConfigurationDto | undefined
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

declare module '@mui/material/SvgIcon' {
  interface SvgIconPropsColorOverrides {
    'muted': true
  }

  interface SvgIconPropsSizeOverrides {
    'extra-small': true
  }
}

/**
 * The version of the app, `<version>+<build id>`. The Portal and the Agents SPA substitute it at build time with Vite
 * `define` (vite-plugins/app-version.ts), so an app reads it instead of importing its own package.json.
 */
declare global {
  const __APP_VERSION__: string
}
