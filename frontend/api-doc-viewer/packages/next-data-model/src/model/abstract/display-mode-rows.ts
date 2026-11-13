import { DisplayMode } from "./display-mode"
import { isDetailedDisplayMode } from "./guards/display-mode"

/**
 * What a row is for the display mode:
 * - `annotation` - human-readable text that explains an element (descriptions, summaries, JSON Schema
 *   validation rows, scope descriptions): shown in `detailed` only;
 * - `structure` - everything else: shown in both modes.
 * Design: docs/design/shared/features/display-mode-annotations.md
 */
export type DisplayModeRowCategory = 'structure' | 'annotation'

/** The category of every row of one row family (one table per family, next to its visibility resolver). */
export type DisplayModeRowCategories<R extends string> = Readonly<Record<R, DisplayModeRowCategory>>

/**
 * The one place of the display-mode rule. Visibility resolvers compute mode-agnostic presence ("the
 * row has content") and pass it through `DisplayModeRows.apply` with their category table.
 */
export class DisplayModeRows {
  public static isShown(category: DisplayModeRowCategory, displayMode: DisplayMode): boolean {
    return category === 'structure' || isDetailedDisplayMode(displayMode)
  }

  /** Visibility per row: present and of a category the display mode shows. */
  public static apply<R extends string>(
    presence: Readonly<Record<R, boolean>>,
    categories: DisplayModeRowCategories<R>,
    displayMode: DisplayMode,
  ): Readonly<Record<R, boolean>> {
    const visibility = {} as Record<R, boolean>
    for (const row of Object.keys(categories) as R[]) {
      visibility[row] = presence[row] && DisplayModeRows.isShown(categories[row], displayMode)
    }
    return visibility
  }
}
