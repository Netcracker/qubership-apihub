import type { LayoutSide } from "@apihub/types/internal/LayoutSide"

/**
 * Position of a row inside a framed group (OpenAPI security cards). Each row draws its own segment
 * of the frame on its own per-side content element - rows render their origin and changed halves
 * separately, so no single element wraps "the card" on one side.
 */
export type FramePosition = 'single' | 'first' | 'middle' | 'last'

export const ATTRIBUTE_FRAME_POSITION = 'data-frame-position'

export type WithFramePositionProps = {
  /** Frame segment per side; `undefined` = no frame (the default for every existing caller). */
  framePosition?: (layoutSide: LayoutSide) => FramePosition | undefined
}
