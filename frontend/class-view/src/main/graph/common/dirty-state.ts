export const DIRTY_STATE_LAYOUT = 'layout-dirty'
export const DIRTY_STATE_VISUAL = 'visual-dirty'
export const DIRTY_STATE_NONE = 'none'

export type DirtyState = typeof DIRTY_STATE_VISUAL | typeof DIRTY_STATE_LAYOUT | typeof DIRTY_STATE_NONE;

export function mergeDirtyState(oneState: DirtyState, anotherState: DirtyState): DirtyState {
  switch (oneState) {
    case DIRTY_STATE_NONE:
      return anotherState
    case DIRTY_STATE_VISUAL:
      return anotherState === DIRTY_STATE_LAYOUT ? DIRTY_STATE_LAYOUT : oneState
    case DIRTY_STATE_LAYOUT:
      return oneState
  }
}