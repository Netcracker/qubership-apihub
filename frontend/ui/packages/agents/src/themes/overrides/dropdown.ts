import type { CSSObject } from '@mui/material/styles'
import { DROPDOWN_SHADOW, LIST_ITEM_HIGHLIGHT_COLOR } from '@netcracker/qubership-apihub-ui-shared/themes/colors'

export const LIST_ITEM_MIN_HEIGHT = 32
export const LIST_ITEM_PADDING = '5px 8px'
export const LIST_LINE_HEIGHT = '20px'

// The sizes are strings, since `sx` reads a bare number as theme spacing or as a multiple of the theme radius
export const DROPDOWN_PAPER_STYLES: CSSObject = {
  padding: '4px',
  borderRadius: '6px',
  boxShadow: DROPDOWN_SHADOW,
}

/**
 * Styles a row of an open list as the design library draws it. MUI gives the row under the pointer, the row reached
 * with the keyboard, and the selected row different backgrounds; the design has one highlight for all of them, so
 * `highlightSelectors` lists every such state of the component.
 */
export function getListItemStyles(highlightSelectors: readonly string[]): CSSObject {
  return {
    minHeight: LIST_ITEM_MIN_HEIGHT,
    padding: LIST_ITEM_PADDING,
    borderRadius: '3px',
    lineHeight: LIST_LINE_HEIGHT,
    [highlightSelectors.join(', ')]: {
      backgroundColor: LIST_ITEM_HIGHLIGHT_COLOR,
    },
  }
}
