import { createContext, useContext } from 'react'
import { DOCUMENT_LAYOUT_MODE, LayoutMode } from '../types/LayoutMode'

export const LayoutModeContext = createContext<LayoutMode>(DOCUMENT_LAYOUT_MODE)

export function useLayoutMode(): LayoutMode {
  return useContext(LayoutModeContext)
}