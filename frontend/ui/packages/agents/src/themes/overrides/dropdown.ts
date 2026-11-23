import type { CSSObject } from '@mui/material/styles'
import {
  DROPDOWN_SHADOW,
  GREY_CLOUD_COLOR,
  GREY_TRANSPARENT_HOVER_COLOR,
} from '@netcracker/qubership-apihub-ui-shared/themes/colors'

import { getScrollbarStyles, SMALL_SCROLLBAR } from './scrollbar'

export const LIST_ITEM_MIN_HEIGHT = 32
export const LIST_ITEM_PADDING = '5px 8px'
export const LIST_LINE_HEIGHT = '20px'

const DROPDOWN_PADDING = 4

// The sizes are strings, since `sx` reads a bare number as theme spacing or as a multiple of the theme radius
export const DROPDOWN_PAPER_STYLES: CSSObject = {
  padding: `${DROPDOWN_PADDING}px`,
  borderRadius: '6px',
  boxShadow: DROPDOWN_SHADOW,
}

/**
 * Styles the element that scrolls an open list, inside the padding of the paper, with the small scrollbar. A
 * scrollbar stands between the padding and the edge of the element, so the element takes the right padding of the
 * paper as its own: the rows keep their distance from the edge, and the scrollbar stands at the edge of the paper.
 */
export const DROPDOWN_SCROLL_STYLES: CSSObject = {
  marginRight: `-${DROPDOWN_PADDING}px`,
  paddingRight: `${DROPDOWN_PADDING}px`,
  ...getScrollbarStyles('&', SMALL_SCROLLBAR),
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
