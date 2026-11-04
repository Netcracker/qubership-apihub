import { Diff, DiffAction, isDiffAdd, isDiffRemove } from "@netcracker/qubership-apihub-api-diff"
import {
  ChangedPropertyMetaData,
  DIFF_HIGHLIGHTING_MODES_DEFAULT,
  DiffStyles,
  HighlightVariant,
} from "./tree-node.interface"

const VISIBLE: DiffStyles = { isContentVisible: true, isHeaderVisible: true }
const ABSENT: DiffStyles = { isContentVisible: false, isHeaderVisible: false, backgroundColor: HighlightVariant.Gray }

/**
 * Diff -> per-side styles for OpenAPI rows. Whole add / remove: the absent side shows nothing (grey),
 * the present side is green / red (and selector options of the node get a green / red border). Replace / rename: yellow on both sides, text highlighted.
 */
export class RowChangedPropertyMetaData {
  public static build(diff: Diff): ChangedPropertyMetaData {
    if (isDiffAdd(diff)) {
      return RowChangedPropertyMetaData.create(diff, ABSENT, { ...VISIBLE, backgroundColor: HighlightVariant.Green, borderShadowColor: HighlightVariant.Green })
    }
    if (isDiffRemove(diff)) {
      return RowChangedPropertyMetaData.create(diff, { ...VISIBLE, backgroundColor: HighlightVariant.Red, borderShadowColor: HighlightVariant.Red }, ABSENT)
    }
    const changed: DiffStyles = { ...VISIBLE, backgroundColor: HighlightVariant.Yellow, textHighlighterColor: HighlightVariant.Yellow }
    return RowChangedPropertyMetaData.create(diff, changed, changed)
  }

  /**
   * Yellow row on both sides without text highlight: a title row painted for a flag change. Built from
   * a value-less `replace` copy (same type and declaration paths): rows read the action, and an add /
   * remove would hide the row's text on one side, a string before / after value would replace it.
   */
  public static buildRowReplace(diff: Diff): ChangedPropertyMetaData {
    const changed: DiffStyles = { ...VISIBLE, backgroundColor: HighlightVariant.Yellow }
    return RowChangedPropertyMetaData.create(RowChangedPropertyMetaData.toValuelessReplace(diff), changed, changed)
  }

  private static toValuelessReplace(diff: Diff): Diff {
    return {
      type: diff.type,
      scope: diff.scope,
      action: DiffAction.replace,
      beforeValue: undefined,
      afterValue: undefined,
      beforeDeclarationPaths: 'beforeDeclarationPaths' in diff ? diff.beforeDeclarationPaths : [],
      afterDeclarationPaths: 'afterDeclarationPaths' in diff ? diff.afterDeclarationPaths : [],
    }
  }

  private static create(diff: Diff, before: DiffStyles, after: DiffStyles): ChangedPropertyMetaData {
    return {
      data: diff,
      styles: { before, after },
      flags: { before: { increaseLevel: false }, after: { increaseLevel: false } },
      highlightingMode: DIFF_HIGHLIGHTING_MODES_DEFAULT,
    }
  }
}
