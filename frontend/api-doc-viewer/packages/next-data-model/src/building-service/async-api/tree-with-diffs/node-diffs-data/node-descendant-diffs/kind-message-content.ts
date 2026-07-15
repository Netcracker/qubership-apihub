import { AbstractNodeDescendantsDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-descendants-diffs-aggregator";
import { DiffStyles, DIFF_HIGHLIGHTING_MODES_DEFAULT, HighlightVariant, NodeDescendantDiffs } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { getValueByPath, takeIfDiffsRecord } from "@apihub/next-data-model/utilities";
import { isDiffAdd, isDiffRemove, isDiffReplace } from "@netcracker/qubership-apihub-api-diff";
import { DiffMetaKeys } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";

export class AsyncApiNodeDescendantDiffsAggregatorKindMessageContent extends AbstractNodeDescendantsDiffsAggregator {
  public aggregate(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    value: object | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    diffsMetaKeys: DiffMetaKeys,
  ): NodeDescendantDiffs | undefined {
    if (!value) {
      return undefined;
    }
    const { diffsMetaKey } = diffsMetaKeys
    const diffsContent = takeIfDiffsRecord(
      getValueByPath(value, [diffsMetaKey])
    )
    const diffsHeaders = diffsContent?.headers
    const diffsPayload = diffsContent?.payload

    const nodeDescendantDiffs: NodeDescendantDiffs = {}
    if (diffsHeaders) {
      let beforeStyles: DiffStyles = { isContentVisible: true, isHeaderVisible: true }
      let afterStyles: DiffStyles = { isContentVisible: true, isHeaderVisible: true }
      if (isDiffAdd(diffsHeaders)) {
        beforeStyles = {
          ...beforeStyles,
          backgroundColor: HighlightVariant.Gray,
        }
        afterStyles = {
          ...afterStyles,
          backgroundColor: HighlightVariant.Green,
        }
      }
      if (isDiffRemove(diffsHeaders)) {
        beforeStyles = {
          ...beforeStyles,
          backgroundColor: HighlightVariant.Red,
        }
        afterStyles = {
          ...afterStyles,
          backgroundColor: HighlightVariant.Gray,
        }
      }
      if (isDiffReplace(diffsHeaders)) {
        beforeStyles = {
          ...beforeStyles,
          backgroundColor: HighlightVariant.Yellow,
        }
        afterStyles = {
          ...afterStyles,
          backgroundColor: HighlightVariant.Yellow,
        }
      }
      nodeDescendantDiffs['headers'] = {
        data: diffsHeaders,
        styles: {
          before: beforeStyles,
          after: afterStyles,
        },
        flags: {
          before: { increaseLevel: false },
          after: { increaseLevel: false },
        },
        highlightingMode: DIFF_HIGHLIGHTING_MODES_DEFAULT
      }
    }
    if (diffsPayload) {
      let beforeStyles: DiffStyles = { isContentVisible: true, isHeaderVisible: true }
      let afterStyles: DiffStyles = { isContentVisible: true, isHeaderVisible: true }
      if (isDiffAdd(diffsPayload)) {
        beforeStyles = {
          ...beforeStyles,
          backgroundColor: HighlightVariant.Gray,
        }
        afterStyles = {
          ...afterStyles,
          backgroundColor: HighlightVariant.Green,
        }
      }
      if (isDiffRemove(diffsPayload)) {
        beforeStyles = {
          ...beforeStyles,
          backgroundColor: HighlightVariant.Red,
        }
        afterStyles = {
          ...afterStyles,
          backgroundColor: HighlightVariant.Gray,
        }
      }
      if (isDiffReplace(diffsPayload)) {
        beforeStyles = {
          ...beforeStyles,
          backgroundColor: HighlightVariant.Yellow,
        }
        afterStyles = {
          ...afterStyles,
          backgroundColor: HighlightVariant.Yellow,
        }
      }
      nodeDescendantDiffs['payload'] = {
        data: diffsPayload,
        styles: {
          before: beforeStyles,
          after: afterStyles,
        },
        flags: {
          before: { increaseLevel: false },
          after: { increaseLevel: false },
        },
        highlightingMode: DIFF_HIGHLIGHTING_MODES_DEFAULT
      }
    }

    return nodeDescendantDiffs;
  }
}