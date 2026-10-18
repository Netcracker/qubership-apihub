import { DiffMetaKeys } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";
import { AbstractNodeDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-aggregator";
import { ChangedPropertyKey, ChangedPropertyMetaData, DIFF_HIGHLIGHTING_MODES_DEFAULT, DIFF_HIGHLIGHTING_MODES_DDL_FLAG_BADGE_SIDE_VISIBILITY_ONLY, DiffStyles, HighlightVariant, ITreeNodeWithDiffs, NODE_LEVEL_DIFF_KEY, NodeDiffs } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { DdlApiTreeNodeValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value";
import { DdlApiTreeNodeKind } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiTreeNodeMeta } from "@apihub/next-data-model/model/ddlapi/types/node-meta";
import { isChangedPropertyMetaData } from "@apihub/next-data-model/shared/ddlapi/guards/property-row-diffs";
import { isObject } from "@apihub/next-data-model/utilities";
import { NodeKey } from "@apihub/next-data-model/utility-types";
import { Diff, DiffAction, DiffType, isDiffAdd, isDiffRemove, isDiffRename, isDiffReplace } from "@netcracker/qubership-apihub-api-diff";

export class DdlApiNodeDiffsAggregatorKindAny
  extends AbstractNodeDiffsAggregator<
    DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
    DdlApiTreeNodeKind,
    DdlApiTreeNodeMeta,
    DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null
  > {
  protected readonly DEFAULT_DIFF_STYLES: DiffStyles = {
    isContentVisible: true,
    isHeaderVisible: true,
  }

  public aggregate(
    crawlValue: object | null,
    diffsMetaKeys: DiffMetaKeys,
    nodeKey: NodeKey,
    parentNode?: ITreeNodeWithDiffs<
      DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
      DdlApiTreeNodeKind,
      DdlApiTreeNodeMeta,
      DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null
    >,
    containerNode?: ITreeNodeWithDiffs<
      DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
      DdlApiTreeNodeKind,
      DdlApiTreeNodeMeta,
      DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null
    >,
  ): NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null> | undefined {
    const { diffsMetaKey } = diffsMetaKeys

    if (!isObject(crawlValue) && !Array.isArray(crawlValue)) {
      return undefined
    }

    const diffs = (crawlValue as Record<PropertyKey, unknown>)[diffsMetaKey]
    const nodeDiffs: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null> = {}

    if (containerNode) {
      const containerNodeDiff = containerNode.diffs[NODE_LEVEL_DIFF_KEY]
      if (containerNodeDiff && (isDiffAdd(containerNodeDiff.data) || isDiffRemove(containerNodeDiff.data))) {
        nodeDiffs[NODE_LEVEL_DIFF_KEY] = { ...containerNodeDiff, inherited: true }
        return nodeDiffs
      }
      const maybeNodeDiffs = containerNode.descendantDiffs[nodeKey]
      if (maybeNodeDiffs) {
        nodeDiffs[NODE_LEVEL_DIFF_KEY] = maybeNodeDiffs
        return nodeDiffs
      }
    } else if (parentNode) {
      const parentNodeDiff = parentNode.diffs[NODE_LEVEL_DIFF_KEY]
      if (parentNodeDiff && (isDiffAdd(parentNodeDiff.data) || isDiffRemove(parentNodeDiff.data))) {
        nodeDiffs[NODE_LEVEL_DIFF_KEY] = { ...parentNodeDiff, inherited: true }
        return nodeDiffs
      }
      const maybeNodeDiffs = parentNode.descendantDiffs[nodeKey]
      if (maybeNodeDiffs) {
        nodeDiffs[NODE_LEVEL_DIFF_KEY] = maybeNodeDiffs
        return nodeDiffs
      }
    }

    if (!AbstractNodeDiffsAggregator.isDiffsRecord(diffs)) {
      return undefined
    }

    const descriptionDiff = diffs['description']
    descriptionDiff && this.aggregateDescriptionTextDiff(descriptionDiff, nodeDiffs)

    return nodeDiffs
  }

  protected aggregateTextDiff(
    diff: Diff<DiffType>,
    key: ChangedPropertyKey<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null>,
    nodeDiffs: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null>,
  ) {
    nodeDiffs[key] = key === 'columnName' || key === 'indexName'
      ? this.buildDdlPropertyNameChangedPropertyMetaDataFromDiff(diff)
      : this.buildChangedPropertyMetaDataFromDiff(diff)
  }

  protected buildChangedPropertyMetaDataFromDiff(diff: Diff<DiffType>): ChangedPropertyMetaData {
    let beforeStyles: DiffStyles = this.DEFAULT_DIFF_STYLES
    let afterStyles: DiffStyles = this.DEFAULT_DIFF_STYLES
    if (isDiffAdd(diff)) {
      beforeStyles = {
        ...beforeStyles,
        isContentVisible: false,
        isHeaderVisible: false,
        backgroundColor: HighlightVariant.Gray,
      }
      afterStyles = {
        ...afterStyles,
        isContentVisible: true,
        isHeaderVisible: true,
        backgroundColor: HighlightVariant.Green,
      }
    }
    if (isDiffRemove(diff)) {
      beforeStyles = {
        ...beforeStyles,
        isContentVisible: true,
        isHeaderVisible: true,
        backgroundColor: HighlightVariant.Red,
      }
      afterStyles = {
        ...afterStyles,
        isContentVisible: false,
        isHeaderVisible: false,
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
    return this.createChangedPropertyMetaData(diff, beforeStyles, afterStyles)
  }

  protected aggregateDescriptionTextDiff(
    diff: Diff<DiffType>,
    nodeDiffs: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null>,
  ): void {
    nodeDiffs.description = this.buildChangedPropertyMetaDataFromDiff(diff)
  }

  protected aggregatePresentDescriptionFromWholeNodeAddOrRemove(
    crawlValue: object,
    nodeDiffs: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null>,
  ): void {
    if (nodeDiffs.description) {
      return
    }

    const description = Reflect.get(crawlValue, 'description')
    if (typeof description !== 'string' || description.length === 0) {
      return
    }

    const nodeLevelDiff = nodeDiffs[NODE_LEVEL_DIFF_KEY]
    if (!nodeLevelDiff) {
      return
    }

    const diff = nodeLevelDiff.data
    if (!isDiffAdd(diff) && !isDiffRemove(diff)) {
      return
    }

    nodeDiffs.description = this.buildChangedPropertyMetaDataFromDiff(diff)
  }

  protected buildDdlPropertyNameChangedPropertyMetaDataFromDiff(
    diff: Diff<DiffType>,
  ): ChangedPropertyMetaData {
    let beforeStyles: DiffStyles = this.DEFAULT_DIFF_STYLES
    let afterStyles: DiffStyles = this.DEFAULT_DIFF_STYLES
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
      }
      afterStyles = {
        ...afterStyles,
        isContentVisible: true,
        backgroundColor: HighlightVariant.Yellow,
      }
    }
    return this.createChangedPropertyMetaData(diff, beforeStyles, afterStyles)
  }

  private createChangedPropertyMetaData(
    diff: Diff<DiffType>,
    beforeStyles: DiffStyles,
    afterStyles: DiffStyles,
  ): ChangedPropertyMetaData {
    return {
      data: diff,
      styles: {
        before: beforeStyles,
        after: afterStyles,
      },
      flags: {
        before: {
          increaseLevel: false,
        },
        after: {
          increaseLevel: false,
        },
      },
      highlightingMode: DIFF_HIGHLIGHTING_MODES_DEFAULT,
    }
  }

  protected readonly TITLE_ROW_FLAG_AS_REPLACE_STYLES: { before: DiffStyles; after: DiffStyles } = {
    before: {
      isContentVisible: true,
      isHeaderVisible: true,
      backgroundColor: HighlightVariant.Yellow,
    },
    after: {
      isContentVisible: true,
      isHeaderVisible: true,
      backgroundColor: HighlightVariant.Yellow,
    },
  }

  protected asReplaceFlagDiffForTitleRow(
    flagDiff: ChangedPropertyMetaData,
  ): ChangedPropertyMetaData {
    const { data } = flagDiff

    if (isDiffReplace(data)) {
      return {
        ...flagDiff,
        styles: this.TITLE_ROW_FLAG_AS_REPLACE_STYLES,
      }
    }

    if (isDiffAdd(data)) {
      return {
        ...flagDiff,
        data: {
          type: data.type,
          scope: data.scope,
          description: data.description,
          action: DiffAction.replace,
          beforeValue: false,
          afterValue: data.afterValue ?? true,
          beforeDeclarationPaths: [],
          afterDeclarationPaths: data.afterDeclarationPaths,
        },
        styles: this.TITLE_ROW_FLAG_AS_REPLACE_STYLES,
      }
    }

    if (isDiffRemove(data)) {
      return {
        ...flagDiff,
        data: {
          type: data.type,
          scope: data.scope,
          description: data.description,
          action: DiffAction.replace,
          beforeValue: data.beforeValue ?? true,
          afterValue: false,
          beforeDeclarationPaths: data.beforeDeclarationPaths,
          afterDeclarationPaths: [],
        },
        styles: this.TITLE_ROW_FLAG_AS_REPLACE_STYLES,
      }
    }

    return flagDiff
  }

  protected adoptNodeLevelDiffFromCrawlIfAbsent(
    diffs: Partial<Record<string, Diff<DiffType>>>,
    nodeDiffs: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null>,
  ): void {
    if (nodeDiffs[NODE_LEVEL_DIFF_KEY]) {
      return
    }

    const wholeNodeDiff = diffs[NODE_LEVEL_DIFF_KEY]
    if (wholeNodeDiff) {
      this.aggregateTextDiff(wholeNodeDiff, NODE_LEVEL_DIFF_KEY, nodeDiffs)
    }
  }

  protected hasWholeNodeAddOrRemoveDiff(
    nodeDiffs: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null>,
  ): boolean {
    const nodeLevelDiff = nodeDiffs[NODE_LEVEL_DIFF_KEY]
    return !!nodeLevelDiff && (isDiffAdd(nodeLevelDiff.data) || isDiffRemove(nodeLevelDiff.data))
  }

  protected adoptPropertyRowDiffs<K extends string>(
    source: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null> | undefined,
    allowedKeys: readonly K[],
  ): Partial<Record<K, ChangedPropertyMetaData>> {
    if (!source) {
      return {}
    }

    const nodeDiffs: Partial<Record<K, ChangedPropertyMetaData>> = {}
    for (const [key, diff] of Object.entries(source)) {
      if (!(allowedKeys as readonly string[]).includes(key) || !isChangedPropertyMetaData(diff)) {
        continue
      }
      nodeDiffs[key as K] = diff
    }

    return nodeDiffs
  }

  protected aggregatePresentFlagDiffsFromWholeNodeAddOrRemove(
    crawlValue: object,
    nodeDiffs: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null>,
    flagKeys: readonly string[],
  ): void {
    const nodeLevelDiff = nodeDiffs[NODE_LEVEL_DIFF_KEY]
    if (!nodeLevelDiff) {
      return
    }

    const diff = nodeLevelDiff.data
    if (!isDiffAdd(diff) && !isDiffRemove(diff)) {
      return
    }

    for (const flagKey of flagKeys) {
      if (!this.takeBooleanFlagValue(crawlValue, flagKey)) {
        continue
      }

      this.aggregateFlagDiffSideVisibilityFromWholeNodeAddOrRemove(
        diff,
        flagKey as ChangedPropertyKey<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null>,
        nodeDiffs,
      )
    }
  }

  protected aggregateFlagDiffSideVisibilityFromWholeNodeAddOrRemove(
    diff: Diff<DiffType>,
    key: ChangedPropertyKey<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null>,
    nodeDiffs: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null>,
  ): void {
    let beforeStyles: DiffStyles = this.DEFAULT_DIFF_STYLES
    let afterStyles: DiffStyles = this.DEFAULT_DIFF_STYLES
    if (isDiffAdd(diff)) {
      beforeStyles = {
        ...beforeStyles,
        isContentVisible: false,
      }
      afterStyles = {
        ...afterStyles,
        isContentVisible: true,
      }
    }
    if (isDiffRemove(diff)) {
      beforeStyles = {
        ...beforeStyles,
        isContentVisible: true,
      }
      afterStyles = {
        ...afterStyles,
        isContentVisible: false,
      }
    }
    nodeDiffs[key] = {
      data: diff,
      styles: {
        before: beforeStyles,
        after: afterStyles,
      },
      flags: {
        before: {
          increaseLevel: false,
        },
        after: {
          increaseLevel: false,
        },
      },
      highlightingMode: DIFF_HIGHLIGHTING_MODES_DDL_FLAG_BADGE_SIDE_VISIBILITY_ONLY,
    }
  }

  protected aggregateFlagDiff(
    diff: Diff<DiffType>,
    key: ChangedPropertyKey<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null>,
    nodeDiffs: NodeDiffs<DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null>,
    currentValue?: boolean,
  ) {
    const normalizedDiff = this.normalizeFlagDiffReplace(diff, currentValue)
    let beforeStyles: DiffStyles = this.DEFAULT_DIFF_STYLES
    let afterStyles: DiffStyles = this.DEFAULT_DIFF_STYLES
    if (isDiffAdd(normalizedDiff)) {
      beforeStyles = {
        ...beforeStyles,
        isContentVisible: false,
        backgroundColor: HighlightVariant.Yellow,
      }
      afterStyles = {
        ...afterStyles,
        isContentVisible: true,
        backgroundColor: HighlightVariant.Yellow,
      }
    }
    if (isDiffRemove(normalizedDiff)) {
      beforeStyles = {
        ...beforeStyles,
        isContentVisible: true,
        backgroundColor: HighlightVariant.Yellow,
      }
      afterStyles = {
        ...afterStyles,
        isContentVisible: false,
        backgroundColor: HighlightVariant.Yellow,
      }
    }
    nodeDiffs[key] = {
      data: normalizedDiff,
      styles: {
        before: beforeStyles,
        after: afterStyles,
      },
      flags: {
        before: {
          increaseLevel: false,
        },
        after: {
          increaseLevel: false,
        },
      },
      highlightingMode: DIFF_HIGHLIGHTING_MODES_DEFAULT,
    }
  }

  protected takeBooleanFlagValue(owner: object, key: PropertyKey): boolean | undefined {
    const value = Reflect.get(owner, key)
    return typeof value === "boolean" ? value : undefined
  }

  protected buildChipReplaceDiffMetadata(
    diff: Diff<DiffType>,
    chipHighlight: Pick<DiffStyles, 'textHighlighterColor' | 'borderShadowColor'>,
  ): ChangedPropertyMetaData {
    const metadata = this.buildChangedPropertyMetaDataFromDiff(diff)
    return {
      ...metadata,
      styles: {
        before: {
          ...metadata.styles.before,
          backgroundColor: undefined,
          textHighlighterColor: chipHighlight.textHighlighterColor,
          borderShadowColor: chipHighlight.borderShadowColor,
        },
        after: {
          ...metadata.styles.after,
          backgroundColor: undefined,
          textHighlighterColor: chipHighlight.textHighlighterColor,
          borderShadowColor: chipHighlight.borderShadowColor,
        },
      },
    }
  }

  protected buildChipAddRemoveDiffMetadata(
    diff: Diff<DiffType>,
    chipHighlight?: {
      addAfter?: Pick<DiffStyles, 'textHighlighterColor' | 'borderShadowColor' | 'isFontMuted'>
      removeBefore?: Pick<DiffStyles, 'textHighlighterColor' | 'borderShadowColor' | 'isFontMuted'>
    },
  ): ChangedPropertyMetaData {
    if (isDiffAdd(diff)) {
      return {
        data: diff,
        styles: {
          before: {
            isContentVisible: false,
            isHeaderVisible: true,
          },
          after: {
            isContentVisible: true,
            isHeaderVisible: true,
            ...chipHighlight?.addAfter,
          },
        },
        flags: {
          before: { increaseLevel: false },
          after: { increaseLevel: false },
        },
        highlightingMode: DIFF_HIGHLIGHTING_MODES_DEFAULT,
      }
    }

    if (isDiffRemove(diff)) {
      return {
        data: diff,
        styles: {
          before: {
            isContentVisible: true,
            isHeaderVisible: true,
            ...chipHighlight?.removeBefore,
          },
          after: {
            isContentVisible: false,
            isHeaderVisible: true,
          },
        },
        flags: {
          before: { increaseLevel: false },
          after: { increaseLevel: false },
        },
        highlightingMode: DIFF_HIGHLIGHTING_MODES_DEFAULT,
      }
    }

    return this.buildChangedPropertyMetaDataFromDiff(diff)
  }

  private normalizeFlagDiffReplace(
    diff: Diff<DiffType>,
    currentValue: boolean | undefined,
  ): Diff<DiffType> {
    if (!isDiffReplace(diff)) {
      return diff
    }

    const resolvedCurrentValue = typeof diff.afterValue === "boolean"
      ? diff.afterValue
      : currentValue
    if (resolvedCurrentValue === undefined) {
      return diff
    }

    if (resolvedCurrentValue) {
      return {
        type: diff.type,
        scope: diff.scope,
        description: diff.description,
        action: DiffAction.add,
        afterValue: true,
        afterDeclarationPaths: diff.afterDeclarationPaths,
      }
    }

    return {
      type: diff.type,
      scope: diff.scope,
      description: diff.description,
      action: DiffAction.remove,
      beforeValue: true,
      beforeDeclarationPaths: diff.beforeDeclarationPaths,
    }
  }
}
