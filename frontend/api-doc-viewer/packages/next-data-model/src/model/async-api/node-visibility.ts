import { DisplayMode } from "../abstract/display-mode"
import { DisplayModeRowCategories, DisplayModeRows } from "../abstract/display-mode-rows"

/** The text rows under an AsyncAPI operation / message / channel / server title. */
export type AsyncApiTextRow = 'summary' | 'description'

export type AsyncApiTextRowPresence = Readonly<Record<AsyncApiTextRow, boolean>>

export type AsyncApiTextRowVisibility = {
  readonly showSummary: boolean
  readonly showDescription: boolean
}

/** Summary and description are annotations: `detailed` only. */
export const ASYNC_API_TEXT_ROW_CATEGORIES: DisplayModeRowCategories<AsyncApiTextRow> = {
  summary: 'annotation',
  description: 'annotation',
}

/**
 * Row visibility of the AsyncAPI layer. Presence ("the row has content on either side") is decided
 * by the caller; this class applies the display mode.
 * Design: docs/design/shared/features/display-mode-annotations.md
 */
export class AsyncApiNodeVisibility {
  public static resolveTextRows(presence: AsyncApiTextRowPresence, displayMode: DisplayMode): AsyncApiTextRowVisibility {
    const shown = DisplayModeRows.apply(presence, ASYNC_API_TEXT_ROW_CATEGORIES, displayMode)
    return { showSummary: shown.summary, showDescription: shown.description }
  }
}
