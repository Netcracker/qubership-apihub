import { useDisplayMode } from '../../contexts/DisplayModeContext'
import { DETAILED_DISPLAY_MODE, SIMPLE_DISPLAY_MODE } from '../DisplayMode'

export function useIsSimpleDisplayMode(): boolean {
  const displayMode = useDisplayMode()
  return displayMode === SIMPLE_DISPLAY_MODE
}

export function useIsDetailedDisplayMode(): boolean {
  const displayMode = useDisplayMode()
  return displayMode === DETAILED_DISPLAY_MODE
}