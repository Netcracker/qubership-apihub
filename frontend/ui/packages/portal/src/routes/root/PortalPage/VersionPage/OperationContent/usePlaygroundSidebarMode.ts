import { EXAMPLES_VIEW_MODE, PLAYGROUND_VIEW_MODE } from '../playground-modes'
import { useSidebarPlaygroundViewMode } from '../useSidebarPlaygroundViewMode'

export function useIsPlaygroundMode(): boolean {
  const [playgroundSidebarMode] = useSidebarPlaygroundViewMode()
  return playgroundSidebarMode === PLAYGROUND_VIEW_MODE
}

export function useIsExamplesMode(): boolean {
  const [playgroundSidebarMode] = useSidebarPlaygroundViewMode()
  return playgroundSidebarMode === EXAMPLES_VIEW_MODE
}

export function useIsPlaygroundSidebarOpen(): boolean {
  const [playgroundSidebarMode] = useSidebarPlaygroundViewMode()
  return playgroundSidebarMode === PLAYGROUND_VIEW_MODE || playgroundSidebarMode === EXAMPLES_VIEW_MODE
}


