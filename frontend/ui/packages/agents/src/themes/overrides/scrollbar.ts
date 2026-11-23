import type { CSSObject } from '@mui/material/styles'
import { GREY_LONDON_FOG_COLOR } from '@netcracker/qubership-apihub-ui-shared/themes/colors'

type ScrollbarSize = Readonly<{
  thumbWidth: number
  /** The space between the thumb and the edge of the element that scrolls, in px. */
  gap: number
}>

/** The Medium scrollbar of the design library, which every element of the Agents app scrolls with by default. */
export const MEDIUM_SCROLLBAR: ScrollbarSize = { thumbWidth: 6, gap: 2 }

/** The Small scrollbar of the design library, which the open lists scroll with. */
export const SMALL_SCROLLBAR: ScrollbarSize = { thumbWidth: 4, gap: 2 }

/**
 * Styles the scrollbars of the elements that `scope` selects (`&` for the element of a style override, an empty
 * string for every element) as the Default style of the scrollbar of the design library: a round "Grey/London Fog"
 * thumb, `gap` px from the edge of the element, with a transparent track.
 */
export function getScrollbarStyles(scope: string, { thumbWidth, gap }: ScrollbarSize): CSSObject {
  const radius = thumbWidth / 2
  // The thumb fills the whole band, so a transparent border on its outer side, which the background does not paint,
  // leaves the gap. The inner edge takes the radius of the outer edge less the border, so the outer corners take a
  // radius larger by the gap across the border to stay as round as the inner ones.
  const outerRadius = radius + gap
  return {
    [`${scope}::-webkit-scrollbar`]: {
      width: `${thumbWidth + gap}px`,
      height: `${thumbWidth + gap}px`,
    },
    [`${scope}::-webkit-scrollbar-thumb`]: {
      backgroundClip: 'padding-box',
      backgroundColor: GREY_LONDON_FOG_COLOR,
    },
    [`${scope}::-webkit-scrollbar-thumb:vertical`]: {
      borderRight: `${gap}px solid transparent`,
      borderRadius: `${radius}px ${outerRadius}px ${outerRadius}px ${radius}px / ${radius}px`,
    },
    [`${scope}::-webkit-scrollbar-thumb:horizontal`]: {
      borderBottom: `${gap}px solid transparent`,
      borderRadius: `${radius}px / ${radius}px ${radius}px ${outerRadius}px ${outerRadius}px`,
    },
  }
}
