import { createContext, useContext } from 'react'
import { DETAILED_DISPLAY_MODE, DisplayMode } from '../types/DisplayMode'

export const DisplayModeContext = createContext<DisplayMode>(DETAILED_DISPLAY_MODE)

export function useDisplayMode(): DisplayMode {
  return useContext(DisplayModeContext)
}