import { AbstractNodeDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-aggregator";
import {
  ChangedPropertyMetaData,
  DIFF_HIGHLIGHTING_MODES_DEFAULT,
  DiffFlags,
  DiffStyles,
  HighlightVariant,
  NODE_LEVEL_DIFF_KEY,
  NodeDescendantDiffs,
  NodeDiffs,
} from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { isObject } from "@apihub/next-data-model/utilities";
import { Diff, DiffType, isDiffAdd, isDiffRemove } from "@netcracker/qubership-apihub-api-diff";

export type DdlApiPropertyListSectionItemRow = {
  readonly columnName?: string
  readonly indexName?: string
}

export function takeDdlPropertyListSectionItems(
  crawlValue: object | null,
): readonly DdlApiPropertyListSectionItemRow[] {
  if (!isObject(crawlValue)) {
    return []
  }

  const items = Reflect.get(crawlValue, 'items')
  if (!Array.isArray(items)) {
    return []
  }

  return items.filter(isObject)
}

export function aggregateUniformWholeNodeDescendantDiff<
  V extends object | null,
>(
  nodeDiffs: NodeDiffs<V>,
  nodeDescendantDiffs: NodeDescendantDiffs,
  childCount: number,
): NodeDiffs<V> | undefined {
  if (nodeDiffs[NODE_LEVEL_DIFF_KEY]) {
    return nodeDiffs
  }

  if (childCount === 0) {
    return undefined
  }

  const descendantDiffEntries = Object.values(nodeDescendantDiffs)
  if (descendantDiffEntries.length !== childCount) {
    return undefined
  }

  const [firstDescendantDiff] = descendantDiffEntries
  if (!firstDescendantDiff) {
    return undefined
  }

  const firstAction = firstDescendantDiff.data.action
  if (!isDiffAdd(firstDescendantDiff.data) && !isDiffRemove(firstDescendantDiff.data)) {
    return undefined
  }

  if (!descendantDiffEntries.every((descendantDiff): descendantDiff is NonNullable<typeof descendantDiff> => {
    if (!descendantDiff) {
      return false
    }

    return descendantDiff.data.action === firstAction
      && (isDiffAdd(descendantDiff.data) || isDiffRemove(descendantDiff.data))
  })) {
    return undefined
  }

  nodeDiffs[NODE_LEVEL_DIFF_KEY] = buildPropertyListSectionWholeNodeChangedPropertyMetaData(
    firstDescendantDiff.data,
  )
  return nodeDiffs
}

export function buildPropertyListSectionWholeNodeChangedPropertyMetaData(
  diff: Diff<DiffType>,
): ChangedPropertyMetaData {
  let beforeStyles: DiffStyles = {
    isContentVisible: true,
    isHeaderVisible: true,
  }
  let afterStyles: DiffStyles = {
    isContentVisible: true,
    isHeaderVisible: true,
  }
  const beforeFlags: DiffFlags = { increaseLevel: false }
  const afterFlags: DiffFlags = beforeFlags

  if (isDiffAdd(diff)) {
    beforeStyles = {
      isContentVisible: false,
      isHeaderVisible: false,
      backgroundColor: HighlightVariant.Gray,
    }
    afterStyles = {
      isContentVisible: true,
      isHeaderVisible: true,
      backgroundColor: HighlightVariant.Green,
    }
  }
  if (isDiffRemove(diff)) {
    beforeStyles = {
      isContentVisible: true,
      isHeaderVisible: true,
      backgroundColor: HighlightVariant.Red,
    }
    afterStyles = {
      isContentVisible: false,
      isHeaderVisible: false,
      backgroundColor: HighlightVariant.Gray,
    }
  }

  return {
    data: diff,
    styles: {
      before: beforeStyles,
      after: afterStyles,
    },
    flags: {
      before: beforeFlags,
      after: afterFlags,
    },
    highlightingMode: DIFF_HIGHLIGHTING_MODES_DEFAULT,
  }
}

export function applyDdlPropertyListItemWholeNodeHeaderVisibility(
  descendantDiff: ChangedPropertyMetaData,
): ChangedPropertyMetaData {
  return {
    ...descendantDiff,
    styles: {
      before: {
        ...descendantDiff.styles.before,
        isHeaderVisible: descendantDiff.styles.before.isContentVisible,
      },
      after: {
        ...descendantDiff.styles.after,
        isHeaderVisible: descendantDiff.styles.after.isContentVisible,
      },
    },
  }
}

export function takeWholeNodeDiffFromItemRow(
  itemRow: object,
  diffsMetaKey: symbol,
): Diff | undefined {
  const rowDiffs = Reflect.get(itemRow, diffsMetaKey)
  if (!AbstractNodeDiffsAggregator.isDiffsRecord(rowDiffs)) {
    return undefined
  }

  const wholeNodeDiff = rowDiffs[NODE_LEVEL_DIFF_KEY]
  if (
    !wholeNodeDiff
    || (!isDiffAdd(wholeNodeDiff) && !isDiffRemove(wholeNodeDiff))
  ) {
    return undefined
  }

  return wholeNodeDiff
}
