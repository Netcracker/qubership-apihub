import { DiffMetaKeys } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";
import { AbstractNodeDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-aggregator";
import { ChangedPropertyMetaData, DIFF_HIGHLIGHTING_MODES_JSO_PROPERTY_CHANGED_INDIRECTLY, HighlightVariant, ITreeNodeWithDiffs, NODE_LEVEL_DIFF_KEY, NodeDiffs } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { JsoTreeNodeDiffsSource } from "@apihub/next-data-model/model/jso/tree-with-diffs/node-diffs-source";
import { JsoTreeNodeValueWithDiffs } from "@apihub/next-data-model/model/jso/tree-with-diffs/node-value";
import { JsoTreeNodeKind } from "@apihub/next-data-model/model/jso/types/node-kind";
import { JsoTreeNodeMeta } from "@apihub/next-data-model/model/jso/types/node-meta";
import { isObject } from "@apihub/next-data-model/utilities";
import { NodeKey } from "@apihub/next-data-model/utility-types";
import { isDiffAdd, isDiffRemove, isDiffReplace } from "@netcracker/qubership-apihub-api-diff";
import { JsoRawValueUtilities } from "../../../json-crawl-entities/transformers/raw-jso-property-to-base-jso-node-value";

export class JsoNodeDiffsAggregatorKindAny
  extends AbstractNodeDiffsAggregator<
    JsoTreeNodeValueWithDiffs | null,
    JsoTreeNodeKind,
    JsoTreeNodeMeta,
    JsoTreeNodeDiffsSource
  > {

  private isComplexValue(value: unknown): value is Record<string, unknown> {
    return isObject(value) || Array.isArray(value)
  }

  public aggregate(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    crawlValue: object | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    diffsMetaKeys: DiffMetaKeys,
    nodeKey: NodeKey,
    parentNode?: ITreeNodeWithDiffs<JsoTreeNodeValueWithDiffs | null, JsoTreeNodeKind, JsoTreeNodeMeta, JsoTreeNodeDiffsSource>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    containerNode?: ITreeNodeWithDiffs<JsoTreeNodeValueWithDiffs | null, JsoTreeNodeKind, JsoTreeNodeMeta, JsoTreeNodeDiffsSource>,
  ): NodeDiffs<JsoTreeNodeDiffsSource> | undefined {
    const nodeDiffs: NodeDiffs<JsoTreeNodeDiffsSource> = {}

    if (parentNode) {
      const parentNodeChangePropertyMetadata = parentNode.diffs[NODE_LEVEL_DIFF_KEY]
      if (parentNodeChangePropertyMetadata) {
        const { data: diff } = parentNodeChangePropertyMetadata
        // add/remove object property/array item in parent
        if (isDiffAdd(diff)) {
          const { afterValue } = diff
          const afterValueType = JsoRawValueUtilities.getValueType(afterValue)
          const isAfterValuePrimitive = JsoRawValueUtilities.isPrimitiveValue(afterValueType)

          if (!isAfterValuePrimitive && this.isComplexValue(afterValue)) {
            const nextAfterValue = afterValue[nodeKey]
            const nextAfterValueType = JsoRawValueUtilities.getValueType(nextAfterValue)
            const isNextAfterValuePrimitive = JsoRawValueUtilities.isPrimitiveValue(nextAfterValueType)

            const propertyMetadata: ChangedPropertyMetaData = {
              data: {
                ...diff,
                afterValue: nextAfterValue,
              },
              styles: {
                before: {
                  isContentVisible: false,
                  isHeaderVisible: false,
                  backgroundColor: HighlightVariant.Gray,
                },
                after: {
                  isContentVisible: isNextAfterValuePrimitive,
                  isHeaderVisible: true,
                  backgroundColor: HighlightVariant.Green,
                },
              },
              flags: {
                before: {
                  increaseLevel: false,
                },
                after: {
                  increaseLevel: true,
                },
              },
              highlightingMode: DIFF_HIGHLIGHTING_MODES_JSO_PROPERTY_CHANGED_INDIRECTLY,
              inherited: true,
            }

            nodeDiffs[NODE_LEVEL_DIFF_KEY] = propertyMetadata
            return nodeDiffs
          }

          nodeDiffs[NODE_LEVEL_DIFF_KEY] = parentNodeChangePropertyMetadata
          return nodeDiffs
        }

        if (isDiffRemove(diff)) {
          const { beforeValue } = diff
          const beforeValueType = JsoRawValueUtilities.getValueType(beforeValue)
          const isBeforeValuePrimitive = JsoRawValueUtilities.isPrimitiveValue(beforeValueType)
          if (!isBeforeValuePrimitive && this.isComplexValue(beforeValue)) {
            const nextBeforeValue = beforeValue[nodeKey]
            const nextBeforeValueType = JsoRawValueUtilities.getValueType(nextBeforeValue)
            const isNextBeforeValuePrimitive = JsoRawValueUtilities.isPrimitiveValue(nextBeforeValueType)

            const propertyMetadata: ChangedPropertyMetaData = {
              data: {
                ...diff,
                beforeValue: nextBeforeValue,
              },
              styles: {
                before: {
                  isContentVisible: isNextBeforeValuePrimitive,
                  isHeaderVisible: true,
                  backgroundColor: HighlightVariant.Red,
                },
                after: {
                  isContentVisible: false,
                  isHeaderVisible: false,
                  backgroundColor: HighlightVariant.Gray,
                },
              },
              flags: {
                before: {
                  increaseLevel: true,
                },
                after: {
                  increaseLevel: false,
                },
              },
              highlightingMode: DIFF_HIGHLIGHTING_MODES_JSO_PROPERTY_CHANGED_INDIRECTLY,
              inherited: true,
            }
            nodeDiffs[NODE_LEVEL_DIFF_KEY] = propertyMetadata
            return nodeDiffs
          }

          nodeDiffs[NODE_LEVEL_DIFF_KEY] = parentNodeChangePropertyMetadata
          return nodeDiffs
        }

        if (isDiffReplace(diff)) {
          const { beforeValue, afterValue } = diff
          const beforeValueType = JsoRawValueUtilities.getValueType(beforeValue)
          const afterValueType = JsoRawValueUtilities.getValueType(afterValue)
          const isBeforeValuePrimitive = JsoRawValueUtilities.isPrimitiveValue(beforeValueType)
          const isAfterValuePrimitive = JsoRawValueUtilities.isPrimitiveValue(afterValueType)

          // primitive <-> primitive
          if (isBeforeValuePrimitive && isAfterValuePrimitive) {
            nodeDiffs[NODE_LEVEL_DIFF_KEY] = parentNodeChangePropertyMetadata
            return nodeDiffs
          }

          // complex <-> primitive
          if (!isBeforeValuePrimitive && this.isComplexValue(beforeValue) && isAfterValuePrimitive) {
            const nextBeforeValue = beforeValue[nodeKey]
            const nextBeforeValueType = JsoRawValueUtilities.getValueType(nextBeforeValue)
            const isNextBeforeValuePrimitive = JsoRawValueUtilities.isPrimitiveValue(nextBeforeValueType)
            const isNextBeforeValuePredefined = JsoRawValueUtilities.isPredefinedValueSet(nextBeforeValueType)

            const propertyMetadata: ChangedPropertyMetaData = {
              data: {
                ...diff,
                beforeValue: nextBeforeValue,
                afterValue: null,
              },
              styles: {
                before: {
                  isContentVisible: isNextBeforeValuePrimitive,
                  isHeaderVisible: true,
                  backgroundColor: HighlightVariant.Yellow,
                  textHighlighterColor: HighlightVariant.Yellow,
                },
                after: {
                  isContentVisible: false,
                  isHeaderVisible: false,
                  backgroundColor: HighlightVariant.Gray,
                },
              },
              flags: {
                before: {
                  increaseLevel: true,
                },
                after: {
                  increaseLevel: false,
                },
              },
              highlightingMode: DIFF_HIGHLIGHTING_MODES_JSO_PROPERTY_CHANGED_INDIRECTLY,
              inherited: true,
            }
            if (isNextBeforeValuePrimitive) {
              propertyMetadata.styles.before.textHighlighterColor = HighlightVariant.Yellow
            }
            if (isNextBeforeValuePredefined) {
              propertyMetadata.styles.before.borderShadowColor = HighlightVariant.Yellow
            }
            nodeDiffs[NODE_LEVEL_DIFF_KEY] = propertyMetadata
            return nodeDiffs
          }

          // primitive <-> complex
          if (!isAfterValuePrimitive && this.isComplexValue(afterValue) && isBeforeValuePrimitive) {
            const nextAfterValue = afterValue[nodeKey]
            const nextAfterValueType = JsoRawValueUtilities.getValueType(nextAfterValue)
            const isNextAfterValuePrimitive = JsoRawValueUtilities.isPrimitiveValue(nextAfterValueType)
            const isNextAfterValuePredefined = JsoRawValueUtilities.isPredefinedValueSet(nextAfterValueType)

            const propertyMetadata: ChangedPropertyMetaData = {
              data: {
                ...diff,
                beforeValue: null,
                afterValue: nextAfterValue,
              },
              styles: {
                before: {
                  isContentVisible: false,
                  isHeaderVisible: false,
                  backgroundColor: HighlightVariant.Gray,
                },
                after: {
                  isContentVisible: isNextAfterValuePrimitive,
                  isHeaderVisible: true,
                  backgroundColor: HighlightVariant.Yellow,
                  textHighlighterColor: HighlightVariant.Yellow,
                },
              },
              flags: {
                before: {
                  increaseLevel: false,
                },
                after: {
                  increaseLevel: true,
                },
              },
              highlightingMode: DIFF_HIGHLIGHTING_MODES_JSO_PROPERTY_CHANGED_INDIRECTLY,
              inherited: true,
            }
            if (isNextAfterValuePrimitive) {
              propertyMetadata.styles.after.textHighlighterColor = HighlightVariant.Yellow
            }
            if (isNextAfterValuePredefined) {
              propertyMetadata.styles.after.borderShadowColor = HighlightVariant.Yellow
            }
            nodeDiffs[NODE_LEVEL_DIFF_KEY] = propertyMetadata
            return nodeDiffs
          }

          // complex <-> complex
          if (!isBeforeValuePrimitive && this.isComplexValue(beforeValue) && !isAfterValuePrimitive && this.isComplexValue(afterValue)) {
            const nextBeforeValue = beforeValue[nodeKey]
            const nextAfterValue = afterValue[nodeKey]
            const nextBeforeValueType = JsoRawValueUtilities.getValueType(nextBeforeValue)
            const nextAfterValueType = JsoRawValueUtilities.getValueType(nextAfterValue)
            const isNextBeforeValuePrimitive = JsoRawValueUtilities.isPrimitiveValue(nextBeforeValueType)
            const isNextAfterValuePrimitive = JsoRawValueUtilities.isPrimitiveValue(nextAfterValueType)
            const isNextBeforeValuePredefined = JsoRawValueUtilities.isPredefinedValueSet(nextBeforeValueType)
            const isNextAfterValuePredefined = JsoRawValueUtilities.isPredefinedValueSet(nextAfterValueType)

            const propertyMetadata: ChangedPropertyMetaData = {
              data: {
                ...diff,
                beforeValue: nextBeforeValue,
                afterValue: nextAfterValue,
              },
              styles: {
                before: {
                  isContentVisible: nextBeforeValue !== undefined && isNextBeforeValuePrimitive,
                  isHeaderVisible: nextBeforeValue !== undefined,
                  backgroundColor: nextBeforeValue === undefined ? HighlightVariant.Gray : HighlightVariant.Yellow,
                  textHighlighterColor: nextBeforeValue !== undefined ? HighlightVariant.Yellow : undefined,
                },
                after: {
                  isContentVisible: nextAfterValue !== undefined && isNextAfterValuePrimitive,
                  isHeaderVisible: nextAfterValue !== undefined,
                  backgroundColor: nextAfterValue === undefined ? HighlightVariant.Gray : HighlightVariant.Yellow,
                  textHighlighterColor: nextAfterValue !== undefined ? HighlightVariant.Yellow : undefined,
                },
              },
              flags: {
                before: {
                  increaseLevel: true,
                },
                after: {
                  increaseLevel: true,
                },
              },
              highlightingMode: DIFF_HIGHLIGHTING_MODES_JSO_PROPERTY_CHANGED_INDIRECTLY,
              inherited: true,
            }

            if (isNextBeforeValuePrimitive) {
              propertyMetadata.styles.before.textHighlighterColor = HighlightVariant.Yellow
            }
            if (isNextAfterValuePrimitive) {
              propertyMetadata.styles.after.textHighlighterColor = HighlightVariant.Yellow
            }

            if (isNextBeforeValuePredefined) {
              propertyMetadata.styles.before.borderShadowColor = HighlightVariant.Yellow
            }
            if (isNextAfterValuePredefined) {
              propertyMetadata.styles.after.borderShadowColor = HighlightVariant.Yellow
            }

            nodeDiffs[NODE_LEVEL_DIFF_KEY] = propertyMetadata
            return nodeDiffs
          }
        }
      } else {
        // add/remove object property/array item itself
        const propertyMetadata = parentNode.descendantDiffs[nodeKey]
        if (propertyMetadata) {
          nodeDiffs[NODE_LEVEL_DIFF_KEY] = propertyMetadata
          return nodeDiffs
        }
      }
    }

    return undefined
  }
}
