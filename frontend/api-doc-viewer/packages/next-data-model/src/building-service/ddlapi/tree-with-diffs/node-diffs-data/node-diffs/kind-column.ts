import { DiffMetaKeys } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";
import { AbstractNodeDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-aggregator";
import { AbstractNodeDiffsSeveritiesAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-severities-aggregator";
import { ChangedPropertyMetaData, HighlightVariant, ITreeNodeWithDiffs, NODE_LEVEL_DIFF_KEY, NodeDiffs } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import {
  DDL_COLUMN_CHANGED_PROPERTY_KEYS,
  DDL_COLUMN_FLAG_DIFF_KEYS,
  DDL_PROPERTY_TITLE_ROW_DIFF_KEY,
  DdlApiColumnPropertyRowDiffs,
  DdlApiEnumValueDiffs,
  DdlApiForeignKeyTargetDiffs,
  DdlApiColumnTypeFieldDiffKey,
  DdlApiColumnTypeFieldDiffs,
  DDL_COLUMN_TYPE_FIELD_DIFF_KEYS,
  DDL_ENUM_COLUMN_TYPE_TRANSITION,
  DdlEnumColumnTypeTransition,
  DDL_DEFAULT_VALUE_COLUMN_TRANSITION,
  DdlDefaultValueColumnTransition,
} from "@apihub/next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs.types";
import { DdlApiTreeNodeValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value";
import { DdlApiTreeNodeKind } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiTreeNodeMeta } from "@apihub/next-data-model/model/ddlapi/types/node-meta";
import { isObject } from "@apihub/next-data-model/utilities";
import { NodeKey } from "@apihub/next-data-model/utility-types";
import { TypeKind } from "@netcracker/qubership-apihub-ddlapi";
import { Diff, DiffAction, isDiffAdd, isDiffRemove, isDiffReplace } from "@netcracker/qubership-apihub-api-diff";
import { isDdlScalarColumnTypeName } from "@apihub/next-data-model/shared/ddlapi/guards/column-type-name";
import { DdlApiNodeDiffsAggregatorKindAny } from "./kind-any";

export class DdlApiNodeDiffsAggregatorKindColumn extends DdlApiNodeDiffsAggregatorKindAny {
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

    const superNodeDiffs = super.aggregate(crawlValue, diffsMetaKeys, nodeKey, parentNode, containerNode)

    const hasColumnTypeFieldDiffs = this.hasColumnTypeFieldDiffs(crawlValue, diffsMetaKey)
    const crawlDiffs = (crawlValue as Record<PropertyKey, unknown>)[diffsMetaKey]
    if (!isObject(crawlDiffs)) {
      if (!hasColumnTypeFieldDiffs) {
        return superNodeDiffs
      }
    }

    const diffs = isObject(crawlDiffs) ? crawlDiffs : {}
    const hasForeignKeyTargetDiffs = AbstractNodeDiffsAggregator.isDiffsRecord(diffs['foreignKeyTargets'])
    const hasEnumValueDiffs = AbstractNodeDiffsAggregator.isDiffsRecord(diffs['enumValues'])
    const hasFlatDiffs = Object.entries(diffs).some(([key, value]) => (
      key !== 'foreignKeyTargets' &&
      key !== 'enumValues' &&
      AbstractNodeDiffsAggregator.isDiff(value)
    ))
    if (!hasFlatDiffs && !hasForeignKeyTargetDiffs && !hasEnumValueDiffs && !hasColumnTypeFieldDiffs) {
      return superNodeDiffs
    }

    const nodeDiffs: DdlApiColumnPropertyRowDiffs = this.adoptPropertyRowDiffs(
      superNodeDiffs,
      DDL_COLUMN_CHANGED_PROPERTY_KEYS,
    )

    this.adoptNodeLevelDiffFromCrawlIfAbsent(
      diffs as Partial<Record<string, Diff>>,
      nodeDiffs,
    )

    const columnNameDiff = diffs['columnName']
    if (AbstractNodeDiffsAggregator.isDiff(columnNameDiff)) {
      this.aggregateTextDiff(columnNameDiff, 'columnName', nodeDiffs)
    }

    const generatedExpressionDiff = diffs['generatedExpression']
    if (AbstractNodeDiffsAggregator.isDiff(generatedExpressionDiff)) {
      this.aggregateTextDiff(
        generatedExpressionDiff,
        'generatedExpression',
        nodeDiffs,
      )
    }

    const defaultValueDiff = diffs['defaultValue']
    if (AbstractNodeDiffsAggregator.isDiff(defaultValueDiff)) {
      this.aggregateDefaultValueDiff(defaultValueDiff, crawlValue, nodeDiffs)
    }

    if (this.hasWholeNodeAddOrRemoveDiff(nodeDiffs)) {
      this.aggregatePresentFlagDiffsFromWholeNodeAddOrRemove(
        crawlValue,
        nodeDiffs,
        DDL_COLUMN_FLAG_DIFF_KEYS,
      )
      this.aggregatePresentDescriptionFromWholeNodeAddOrRemove(crawlValue, nodeDiffs)
      this.aggregateEnumValuesRowColorizingDiffFromWholeNode(crawlValue, nodeDiffs)
      if (nodeDiffs.defaultValue) {
        this.aggregateDefaultValueRowColorizingDiff(crawlValue, nodeDiffs)
      } else {
        this.aggregateDefaultValueRowColorizingDiffFromWholeNode(crawlValue, nodeDiffs)
      }
      this.aggregatePropertyTitleRowDiff(nodeDiffs)
      return nodeDiffs
    }

    const isPrimaryKeyDiff = diffs['isPrimaryKey']
    if (AbstractNodeDiffsAggregator.isDiff(isPrimaryKeyDiff)) {
      this.aggregateFlagDiff(
        isPrimaryKeyDiff,
        'isPrimaryKey',
        nodeDiffs,
        this.takeBooleanFlagValue(crawlValue, 'isPrimaryKey'),
      )
    }

    const isGeneratedDiff = diffs['isGenerated']
    if (AbstractNodeDiffsAggregator.isDiff(isGeneratedDiff)) {
      this.aggregateFlagDiff(
        isGeneratedDiff,
        'isGenerated',
        nodeDiffs,
        this.takeBooleanFlagValue(crawlValue, 'isGenerated'),
      )
    }

    const isUniqueDiff = diffs['isUnique']
    if (AbstractNodeDiffsAggregator.isDiff(isUniqueDiff)) {
      this.aggregateFlagDiff(
        isUniqueDiff,
        'isUnique',
        nodeDiffs,
        this.takeBooleanFlagValue(crawlValue, 'isUnique'),
      )
    }

    const isNotNullDiff = diffs['isNotNull']
    if (AbstractNodeDiffsAggregator.isDiff(isNotNullDiff)) {
      this.aggregateFlagDiff(
        isNotNullDiff,
        'isNotNull',
        nodeDiffs,
        this.takeBooleanFlagValue(crawlValue, 'isNotNull'),
      )
    }

    this.aggregateForeignKeyTargetDiffs(diffs, nodeDiffs)

    this.aggregateEnumValueDiffs(diffs, nodeDiffs)

    this.aggregateColumnTypeFieldDiffs(crawlValue, diffsMetaKey, nodeDiffs)

    this.aggregateEnumValuesRowColorizingDiff(crawlValue, nodeDiffs)

    this.aggregateDefaultValueRowColorizingDiff(crawlValue, nodeDiffs)

    this.aggregatePropertyTitleRowDiff(nodeDiffs)

    return nodeDiffs
  }

  private aggregatePropertyTitleRowDiff(
    nodeDiffs: DdlApiColumnPropertyRowDiffs,
  ): void {
    const nodeLevelDiff = nodeDiffs[NODE_LEVEL_DIFF_KEY]
    if (nodeLevelDiff && (isDiffAdd(nodeLevelDiff.data) || isDiffRemove(nodeLevelDiff.data))) {
      nodeDiffs[DDL_PROPERTY_TITLE_ROW_DIFF_KEY] = nodeLevelDiff
      return
    }

    const nameDiff = nodeDiffs.columnName
    if (nameDiff) {
      nodeDiffs[DDL_PROPERTY_TITLE_ROW_DIFF_KEY] = nameDiff
      return
    }

    for (const flagKey of DDL_COLUMN_FLAG_DIFF_KEYS) {
      const flagDiff = nodeDiffs[flagKey]
      if (flagDiff) {
        nodeDiffs[DDL_PROPERTY_TITLE_ROW_DIFF_KEY] = this.asReplaceFlagDiffForTitleRow(flagDiff)
        return
      }
    }

    const foreignKeyTargetDiffs = nodeDiffs.foreignKeyTargetDiffs
    if (foreignKeyTargetDiffs) {
      const firstTargetDiff = Object.values(foreignKeyTargetDiffs).find(Boolean)
      if (firstTargetDiff) {
        nodeDiffs[DDL_PROPERTY_TITLE_ROW_DIFF_KEY] = this.asReplaceFlagDiffForTitleRow(firstTargetDiff)
        return
      }
    }

    if (nodeDiffs[DDL_PROPERTY_TITLE_ROW_DIFF_KEY]) {
      return
    }

    this.aggregateColumnTypeTitleRowDiff(nodeDiffs)
  }

  private aggregateColumnTypeTitleRowDiff(
    nodeDiffs: DdlApiColumnPropertyRowDiffs,
  ): void {
    const columnTypeFieldDiffs = nodeDiffs.columnTypeFieldDiffs
    if (!columnTypeFieldDiffs || Object.keys(columnTypeFieldDiffs).length === 0) {
      return
    }

    const representativeDiff = AbstractNodeDiffsSeveritiesAggregator.maxChangedPropertyMetaDataByDiffType(
      ...Object.values(columnTypeFieldDiffs),
    )
    if (!representativeDiff) {
      return
    }

    nodeDiffs[DDL_PROPERTY_TITLE_ROW_DIFF_KEY] = this.asReplaceFlagDiffForTitleRow(representativeDiff)
  }

  private aggregateForeignKeyTargetDiffs(
    diffs: object,
    nodeDiffs: DdlApiColumnPropertyRowDiffs,
  ): void {
    const foreignKeyTargetsDiffRecord = (diffs as Record<string, unknown>)['foreignKeyTargets']
    if (!AbstractNodeDiffsAggregator.isDiffsRecord(foreignKeyTargetsDiffRecord)) {
      return
    }

    const foreignKeyTargetDiffs: DdlApiForeignKeyTargetDiffs = {}
    for (const [targetKey, diff] of Object.entries(foreignKeyTargetsDiffRecord)) {
      if (!diff) {
        continue
      }
      foreignKeyTargetDiffs[targetKey] = this.buildForeignKeyTargetDiffMetadata(diff)
    }

    if (Object.keys(foreignKeyTargetDiffs).length > 0) {
      nodeDiffs.foreignKeyTargetDiffs = foreignKeyTargetDiffs
    }
  }

  private aggregateEnumValueDiffs(
    diffs: object,
    nodeDiffs: DdlApiColumnPropertyRowDiffs,
  ): void {
    const enumValuesDiffRecord = (diffs as Record<string, unknown>)['enumValues']
    if (!AbstractNodeDiffsAggregator.isDiffsRecord(enumValuesDiffRecord)) {
      return
    }

    const enumValueDiffs: DdlApiEnumValueDiffs = {}
    for (const [literalKey, diff] of Object.entries(enumValuesDiffRecord)) {
      if (!diff) {
        continue
      }
      enumValueDiffs[literalKey] = this.buildEnumValueDiffMetadata(diff)
    }

    if (Object.keys(enumValueDiffs).length > 0) {
      nodeDiffs.enumValueDiffs = enumValueDiffs
    }
  }

  private aggregateEnumValuesRowColorizingDiffFromWholeNode(
    crawlValue: object,
    nodeDiffs: DdlApiColumnPropertyRowDiffs,
  ): void {
    const enumValues = Reflect.get(crawlValue, 'enumValues')
    if (!Array.isArray(enumValues) || enumValues.length === 0) {
      return
    }

    const nodeLevelDiff = nodeDiffs[NODE_LEVEL_DIFF_KEY]
    if (!nodeLevelDiff) {
      return
    }

    nodeDiffs.enumValuesRowColorizingDiff = nodeLevelDiff
  }

  private aggregateDefaultValueRowColorizingDiffFromWholeNode(
    crawlValue: object,
    nodeDiffs: DdlApiColumnPropertyRowDiffs,
  ): void {
    const defaultValue = Reflect.get(crawlValue, 'defaultValue')
    if (defaultValue === undefined || defaultValue === null) {
      return
    }

    const nodeLevelDiff = nodeDiffs[NODE_LEVEL_DIFF_KEY]
    if (!nodeLevelDiff) {
      return
    }

    nodeDiffs.defaultValueRowColorizingDiff = nodeLevelDiff
  }

  private aggregateEnumValuesRowColorizingDiff(
    crawlValue: object,
    nodeDiffs: DdlApiColumnPropertyRowDiffs,
  ): void {
    const transitionDirection = this.resolveEnumColumnTypeTransitionDirection(crawlValue, nodeDiffs)

    if (transitionDirection === DDL_ENUM_COLUMN_TYPE_TRANSITION.ToEnum) {
      const representativeDiff = this.takeRepresentativeColumnTypeFieldDiff(nodeDiffs)
      if (representativeDiff) {
        nodeDiffs.enumValuesRowColorizingDiff = this.buildSyntheticEnumValuesRowColorizingDiff(
          DiffAction.add,
          representativeDiff.data,
        )
      }
      return
    }

    const enumValueDiffs = nodeDiffs.enumValueDiffs
    if (!enumValueDiffs || Object.keys(enumValueDiffs).length === 0) {
      if (transitionDirection === DDL_ENUM_COLUMN_TYPE_TRANSITION.FromEnum) {
        const representativeDiff = this.takeRepresentativeColumnTypeFieldDiff(nodeDiffs)
        if (representativeDiff) {
          nodeDiffs.enumValuesRowColorizingDiff = this.buildSyntheticEnumValuesRowColorizingDiff(
            DiffAction.remove,
            representativeDiff.data,
          )
        }
      }
      return
    }

    if (
      transitionDirection === DDL_ENUM_COLUMN_TYPE_TRANSITION.FromEnum &&
      Object.values(enumValueDiffs).every(diff => diff && isDiffRemove(diff.data))
    ) {
      const representativeDiff = AbstractNodeDiffsSeveritiesAggregator.maxChangedPropertyMetaDataByDiffType(
        ...Object.values(enumValueDiffs),
      )
      if (representativeDiff) {
        nodeDiffs.enumValuesRowColorizingDiff = this.buildSyntheticEnumValuesRowColorizingDiff(
          DiffAction.remove,
          representativeDiff.data,
        )
      }
      this.stripEnumValueChipHighlightForColumnTypeTransition(nodeDiffs)
      return
    }

    const representativeDiff = AbstractNodeDiffsSeveritiesAggregator.maxChangedPropertyMetaDataByDiffType(
      ...Object.values(enumValueDiffs),
    )
    if (!representativeDiff) {
      return
    }

    nodeDiffs.enumValuesRowColorizingDiff = this.asReplaceFlagDiffForTitleRow(representativeDiff)
  }

  private aggregateDefaultValueDiff(
    diff: Diff,
    crawlValue: object,
    nodeDiffs: DdlApiColumnPropertyRowDiffs,
  ): void {
    nodeDiffs.defaultValue = this.buildDefaultValueDiffMetadata(diff, crawlValue)
  }

  private aggregateDefaultValueRowColorizingDiff(
    crawlValue: object,
    nodeDiffs: DdlApiColumnPropertyRowDiffs,
  ): void {
    const defaultValueDiff = nodeDiffs.defaultValue
    const disallowedTransition = this.resolveDefaultValueDisallowedTransition(crawlValue, nodeDiffs)

    if (disallowedTransition === DDL_DEFAULT_VALUE_COLUMN_TRANSITION.Gained && !defaultValueDiff) {
      const representativeDiff = nodeDiffs.isGenerated
        ?? this.takeRepresentativeColumnTypeFieldDiff(nodeDiffs)
      if (representativeDiff) {
        nodeDiffs.defaultValueRowColorizingDiff = this.buildSyntheticEnumValuesRowColorizingDiff(
          DiffAction.add,
          representativeDiff.data,
        )
      }
      return
    }

    if (!defaultValueDiff) {
      return
    }

    const diff = defaultValueDiff.data
    if (isDiffAdd(diff) || isDiffRemove(diff)) {
      nodeDiffs.defaultValueRowColorizingDiff = this.buildChangedPropertyMetaDataFromDiff(diff)
      return
    }

    if (isDiffReplace(diff)) {
      nodeDiffs.defaultValueRowColorizingDiff = this.asReplaceFlagDiffForTitleRow(defaultValueDiff)
    }
  }

  private resolveDefaultValueDisallowedTransition(
    crawlValue: object,
    nodeDiffs: DdlApiColumnPropertyRowDiffs,
  ): DdlDefaultValueColumnTransition | undefined {
    const mergedDefaultValue = Reflect.get(crawlValue, "defaultValue")
    const mergedIsGenerated = Reflect.get(crawlValue, "isGenerated") === true
    const isGeneratedDiff = nodeDiffs.isGenerated?.data

    if (
      !mergedIsGenerated &&
      isGeneratedDiff &&
      isDiffRemove(isGeneratedDiff) &&
      mergedDefaultValue !== undefined &&
      !nodeDiffs.defaultValue
    ) {
      return DDL_DEFAULT_VALUE_COLUMN_TRANSITION.Gained
    }

    return undefined
  }

  private buildDefaultValueDiffMetadata(
    diff: Diff,
    crawlValue: object,
  ): ChangedPropertyMetaData {
    if (isDiffReplace(diff)) {
      const isBooleanDefault = this.isBooleanColumnCrawlValue(crawlValue)
      return this.buildChipReplaceDiffMetadata(diff, {
        borderShadowColor: isBooleanDefault ? HighlightVariant.Yellow : undefined,
        textHighlighterColor: isBooleanDefault ? undefined : HighlightVariant.Yellow,
      })
    }

    return this.buildChipAddRemoveDiffMetadata(diff)
  }

  private isBooleanColumnCrawlValue(crawlValue: object): boolean {
    const columnType = Reflect.get(crawlValue, 'columnType')
    return isObject(columnType) && columnType.kind === TypeKind.BoolType
  }

  private resolveEnumColumnTypeTransitionDirection(
    crawlValue: object,
    nodeDiffs: DdlApiColumnPropertyRowDiffs,
  ): DdlEnumColumnTypeTransition | undefined {
    const representativeDiff = this.takeRepresentativeColumnTypeFieldDiff(nodeDiffs)
    if (!representativeDiff || !isDiffReplace(representativeDiff.data)) {
      return undefined
    }

    const beforeName = typeof representativeDiff.data.beforeValue === 'string'
      ? representativeDiff.data.beforeValue
      : undefined
    const afterName = typeof representativeDiff.data.afterValue === 'string'
      ? representativeDiff.data.afterValue
      : undefined
    if (!beforeName || !afterName) {
      return undefined
    }

    const columnType = Reflect.get(crawlValue, 'columnType')
    const mergedIsEnum = isObject(columnType) && columnType.kind === TypeKind.EnumType

    if (mergedIsEnum && isDdlScalarColumnTypeName(beforeName) && !isDdlScalarColumnTypeName(afterName)) {
      return DDL_ENUM_COLUMN_TYPE_TRANSITION.ToEnum
    }

    if (!mergedIsEnum && !isDdlScalarColumnTypeName(beforeName) && isDdlScalarColumnTypeName(afterName)) {
      return DDL_ENUM_COLUMN_TYPE_TRANSITION.FromEnum
    }

    return undefined
  }

  private takeRepresentativeColumnTypeFieldDiff(
    nodeDiffs: DdlApiColumnPropertyRowDiffs,
  ): ChangedPropertyMetaData | undefined {
    const columnTypeFieldDiffs = nodeDiffs.columnTypeFieldDiffs
    if (!columnTypeFieldDiffs) {
      return undefined
    }

    return columnTypeFieldDiffs.typeName
      ?? columnTypeFieldDiffs.label
      ?? AbstractNodeDiffsSeveritiesAggregator.maxChangedPropertyMetaDataByDiffType(
        ...Object.values(columnTypeFieldDiffs),
      )
  }

  private buildSyntheticEnumValuesRowColorizingDiff(
    action: typeof DiffAction.add | typeof DiffAction.remove,
    sourceDiff: Diff,
  ): ChangedPropertyMetaData {
    const syntheticDiff: Diff = action === DiffAction.add
      ? {
        type: sourceDiff.type,
        scope: sourceDiff.scope,
        action: DiffAction.add,
        afterValue: true,
        afterDeclarationPaths: ('afterDeclarationPaths' in sourceDiff
          ? sourceDiff.afterDeclarationPaths
          : undefined) ?? [],
      }
      : {
        type: sourceDiff.type,
        scope: sourceDiff.scope,
        action: DiffAction.remove,
        beforeValue: true,
        beforeDeclarationPaths: ('beforeDeclarationPaths' in sourceDiff
          ? sourceDiff.beforeDeclarationPaths
          : undefined) ?? [],
      }

    return this.buildChangedPropertyMetaDataFromDiff(syntheticDiff)
  }

  private stripEnumValueChipHighlightForColumnTypeTransition(
    nodeDiffs: DdlApiColumnPropertyRowDiffs,
  ): void {
    const enumValueDiffs = nodeDiffs.enumValueDiffs
    if (!enumValueDiffs) {
      return
    }

    for (const [literalKey, metadata] of Object.entries(enumValueDiffs)) {
      if (!metadata || !isDiffRemove(metadata.data)) {
        continue
      }
      enumValueDiffs[literalKey] = this.buildChipAddRemoveDiffMetadata(metadata.data)
    }
  }

  private buildEnumValueDiffMetadata(diff: Diff): ChangedPropertyMetaData {
    if (isDiffReplace(diff)) {
      return this.buildChipReplaceDiffMetadata(diff, {
        textHighlighterColor: HighlightVariant.Yellow,
      })
    }

    return this.buildChipAddRemoveDiffMetadata(diff, {
      addAfter: { borderShadowColor: HighlightVariant.Green },
      removeBefore: { borderShadowColor: HighlightVariant.Red, isFontMuted: true },
    })
  }

  private buildForeignKeyTargetDiffMetadata(diff: Diff): ChangedPropertyMetaData {
    const metadata = this.buildChangedPropertyMetaDataFromDiff(diff)

    if (isDiffAdd(diff)) {
      return {
        ...metadata,
        styles: {
          ...metadata.styles,
          after: {
            ...metadata.styles.after,
            textHighlighterColor: HighlightVariant.Green,
          },
        },
      }
    }

    if (isDiffRemove(diff)) {
      return {
        ...metadata,
        styles: {
          ...metadata.styles,
          before: {
            ...metadata.styles.before,
            textHighlighterColor: HighlightVariant.Red,
          },
        },
      }
    }

    return metadata
  }

  private hasColumnTypeFieldDiffs(
    crawlValue: object,
    diffsMetaKey: PropertyKey,
  ): boolean {
    const columnType = Reflect.get(crawlValue, "columnType")
    if (!isObject(columnType)) {
      return false
    }

    const columnTypeCrawlDiffs = columnType[diffsMetaKey]
    if (!AbstractNodeDiffsAggregator.isDiffsRecord(columnTypeCrawlDiffs)) {
      return false
    }

    return Object.values(columnTypeCrawlDiffs).some(AbstractNodeDiffsAggregator.isDiff)
  }

  private readColumnTypeFieldDiffs(
    crawlValue: object,
    diffsMetaKey: PropertyKey,
  ): DdlApiColumnTypeFieldDiffs {
    const columnTypeFieldDiffs: DdlApiColumnTypeFieldDiffs = {}
    const columnType = Reflect.get(crawlValue, "columnType")
    if (!isObject(columnType)) {
      return columnTypeFieldDiffs
    }

    const columnTypeCrawlDiffs = columnType[diffsMetaKey]
    if (!AbstractNodeDiffsAggregator.isDiffsRecord(columnTypeCrawlDiffs)) {
      return columnTypeFieldDiffs
    }

    for (const [crawlKey, diff] of Object.entries(columnTypeCrawlDiffs)) {
      if (!diff) {
        continue
      }

      const fieldKey = this.normalizeColumnTypeFieldDiffKey(crawlKey)
      if (!fieldKey) {
        continue
      }

      columnTypeFieldDiffs[fieldKey] = this.buildColumnTypeFieldDiffMetadata(diff)
    }

    return columnTypeFieldDiffs
  }

  private aggregateColumnTypeFieldDiffs(
    crawlValue: object,
    diffsMetaKey: PropertyKey,
    nodeDiffs: DdlApiColumnPropertyRowDiffs,
  ): void {
    const columnTypeFieldDiffs = this.readColumnTypeFieldDiffs(crawlValue, diffsMetaKey)

    if (Object.keys(columnTypeFieldDiffs).length > 0) {
      nodeDiffs.columnTypeFieldDiffs = columnTypeFieldDiffs
    }
  }

  private normalizeColumnTypeFieldDiffKey(
    crawlKey: string,
  ): DdlApiColumnTypeFieldDiffKey | undefined {
    if (crawlKey === "type") {
      return "typeName"
    }
    if ((DDL_COLUMN_TYPE_FIELD_DIFF_KEYS as readonly string[]).includes(crawlKey)) {
      return crawlKey as DdlApiColumnTypeFieldDiffKey
    }
    return undefined
  }

  private buildColumnTypeFieldDiffMetadata(diff: Diff): ChangedPropertyMetaData {
    if (isDiffReplace(diff)) {
      return this.buildChipReplaceDiffMetadata(diff, {
        textHighlighterColor: HighlightVariant.Yellow,
      })
    }

    return this.buildChipAddRemoveDiffMetadata(diff, {
      addAfter: { textHighlighterColor: HighlightVariant.Green },
      removeBefore: { textHighlighterColor: HighlightVariant.Red },
    })
  }
}
