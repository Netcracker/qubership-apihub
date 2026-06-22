import { DIFF_HIGHLIGHTING_MODES_DEFAULT, DiffStyles, HighlightVariant, NODE_LEVEL_DIFF_KEY, NodeDescendantDiffs, NodeDiffs } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { Diff, DiffType, isDiffAdd, isDiffRemove, isDiffRename, isDiffReplace } from "@netcracker/qubership-apihub-api-diff";
import { DiffMetaKeys } from "./diff-meta-keys";

export abstract class AbstractNodeDescendantsDiffsAggregator {
  protected static readonly DEFAULT_DIFF_STYLES: DiffStyles = {
    isContentVisible: true,
    isHeaderVisible: true,
  }

  public abstract aggregate(
    value: object | null,
    diffsMetaKeys: DiffMetaKeys,
    referenceNamePropertyKey: symbol
  ): NodeDescendantDiffs | undefined;

  protected aggregateWholeNodeDiff<
    V extends object | null,
  >(
    diff: Diff<DiffType>,
    nodeDiffs: NodeDiffs<V>,
  ) {
    let beforeStyles: DiffStyles = AbstractNodeDescendantsDiffsAggregator.DEFAULT_DIFF_STYLES
    let afterStyles: DiffStyles = AbstractNodeDescendantsDiffsAggregator.DEFAULT_DIFF_STYLES
    if (isDiffAdd(diff)) {
      beforeStyles = {
        ...beforeStyles,
        isContentVisible: false,
        backgroundColor: HighlightVariant.Gray,
      }
      afterStyles = {
        ...afterStyles,
        isContentVisible: true,
        backgroundColor: HighlightVariant.Green,
      }
    }
    if (isDiffRemove(diff)) {
      beforeStyles = {
        ...beforeStyles,
        isContentVisible: true,
        backgroundColor: HighlightVariant.Red,
      }
      afterStyles = {
        ...afterStyles,
        isContentVisible: false,
        backgroundColor: HighlightVariant.Gray,
      }
    }
    if (isDiffRename(diff) || isDiffReplace(diff)) {
      beforeStyles = {
        ...beforeStyles,
        isContentVisible: true,
        backgroundColor: HighlightVariant.Yellow,
        textHighlighterColor: HighlightVariant.Yellow,
      }
      afterStyles = {
        ...afterStyles,
        isContentVisible: true,
        backgroundColor: HighlightVariant.Yellow,
        textHighlighterColor: HighlightVariant.Yellow,
      }
    }
    nodeDiffs[NODE_LEVEL_DIFF_KEY] = {
      data: diff,
      styles: {
        before: beforeStyles,
        after: afterStyles,
      },
      flags: {
        before: {
          increaseLevel: true,
        },
        after: {
          increaseLevel: true,
        },
      },
      highlightingMode: DIFF_HIGHLIGHTING_MODES_DEFAULT,
    }
  }
}
