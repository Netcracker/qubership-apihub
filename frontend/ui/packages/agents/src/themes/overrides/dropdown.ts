import type { CSSObject } from '@mui/material/styles'
import {
  DROPDOWN_SHADOW,
  GREY_CLOUD_COLOR,
  GREY_TRANSPARENT_HOVER_COLOR,
} from '@netcracker/qubership-apihub-ui-shared/themes/colors'

export const LIST_ITEM_MIN_HEIGHT = 32
export const LIST_ITEM_PADDING = '5px 8px'
export const LIST_LINE_HEIGHT = '20px'

// The sizes are strings, since `sx` reads a bare number as theme spacing or as a multiple of the theme radius
export const DROPDOWN_PAPER_STYLES: CSSObject = {
  padding: '4px',
  borderRadius: '6px',
  boxShadow: DROPDOWN_SHADOW,
}

type ListItemStateSelectors = {
  // The row under the pointer and the row reached with the keyboard
  hover: readonly string[]
  // The selected row in every other state, which keeps the color of the selection
  selected: readonly string[]
}

/**
 * Styles a row of an open list as the design library draws it. MUI tints the row under the pointer, the row reached
 * with the keyboard, and the selected row in shades of its own colors. The design draws one grey highlight, which
 * marks the selected row here; the row under the pointer takes the lighter "Grey/Cloud" of the palette, so that it
 * does not merge with a selected row next to it.
 */
export function getListItemStyles({ hover, selected }: ListItemStateSelectors): CSSObject {
  return {
    minHeight: LIST_ITEM_MIN_HEIGHT,
    padding: LIST_ITEM_PADDING,
    borderRadius: '3px',
    lineHeight: LIST_LINE_HEIGHT,
    [hover.join(', ')]: {
      backgroundColor: GREY_CLOUD_COLOR,
    },
    // Comes after the hover, so a selected row under the pointer keeps the color of the selection
    [selected.join(', ')]: {
      backgroundColor: GREY_TRANSPARENT_HOVER_COLOR,
    },
  }
}
