export const PLAYGROUND_VIEW_MODE = 'playground'
export const EXAMPLES_VIEW_MODE = 'examples'

export type PlaygroundSidebarViewMode =
  | typeof PLAYGROUND_VIEW_MODE
  | typeof EXAMPLES_VIEW_MODE

export const PLAYGROUND_SIDEBAR_VIEW_MODES: ReadonlyArray<Partial<PlaygroundSidebarViewMode>> = [
  PLAYGROUND_VIEW_MODE,
  EXAMPLES_VIEW_MODE,
]
