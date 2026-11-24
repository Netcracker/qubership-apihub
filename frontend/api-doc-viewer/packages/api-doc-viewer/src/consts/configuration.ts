import { DETAILED_DISPLAY_MODE } from '../types/DisplayMode'
import { DOCUMENT_LAYOUT_MODE } from '../types/LayoutMode'

export const DEFAULT_EXPANDED_DEPTH: number = 2
export const INFINITY_EXPANDING_DEPTH: number = 2
export const DIFF_META_KEY = Symbol('$diff')

export const DEFAULT_DISPLAY_MODE = DETAILED_DISPLAY_MODE
export const DEFAULT_LAYOUT_MODE = DOCUMENT_LAYOUT_MODE
export const DEFAULT_ROW_DEPTH = 0

// Defaults & Placeholders

export const DEFAULT_SERIES_ITEM = '<empty string>'
export const DEFAULT_SERIES_ITEM_TEXT_COLOR = 'text-gray-400/[.8]'

// TODO 14.08.24 // Implement configuring gaps between group node properties.
// Possibly it should be like a graph:
// for example, there must be config for gaps between A & B, B & C, A & C
// to cover cases when one prop or more is absent
