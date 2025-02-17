export type TimeoutOption = {
  timeout?: number
}

export type ReloadOptions = TimeoutOption & {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit'
}

export type GotoOptions = TimeoutOption & {
  referer?: string
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit'
}

export type ClickOptions = TimeoutOption & {
  button?: 'left' | 'right' | 'middle'
  clickCount?: number
  delay?: number
  force?: boolean
  modifiers?: Array<'Alt' | 'Control' | 'Meta' | 'Shift'>
  noWaitAfter?: boolean
  position?: {
    x: number
    y: number
  }
  trial?: boolean
}

export type HoverOptions = TimeoutOption & {
  force?: boolean
  modifiers?: Array<'Alt' | 'Control' | 'Meta' | 'Shift'>
  noWaitAfter?: boolean
  position?: {
    x: number
    y: number
  }
  trial?: boolean
}

export type FillOptions = TimeoutOption & {
  force?: boolean
  noWaitAfter?: boolean
}

export type TypeOptions = TimeoutOption & {
  delay?: number
  noWaitAfter?: boolean
}

export type ClearOptions = TimeoutOption & {
  force?: boolean
  noWaitAfter?: boolean
}

export type CheckOptions = {
  force?: boolean
  noWaitAfter?: boolean
  position?: {
    x: number
    y: number
  }
}

export type CloseOptions = {
  reason?: string
  runBeforeUnload?: boolean
}

export type SetInputFilesOptions = TimeoutOption & {
  noWaitAfter?: boolean
}
