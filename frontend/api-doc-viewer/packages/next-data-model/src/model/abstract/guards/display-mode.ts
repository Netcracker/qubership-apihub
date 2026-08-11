import {
  DETAILED_DISPLAY_MODE,
  DisplayMode,
  SIMPLE_DISPLAY_MODE,
} from "../display-mode"

export function isSimpleDisplayMode(displayMode: DisplayMode): boolean {
  return displayMode === SIMPLE_DISPLAY_MODE
}

export function isDetailedDisplayMode(displayMode: DisplayMode): boolean {
  return displayMode === DETAILED_DISPLAY_MODE
}
