import { DiffMetaKeys } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys";
import { AbstractNodeDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-aggregator";
import {
  ITreeNodeWithDiffs,
  NODE_LEVEL_DIFF_KEY,
  NodeDiffs,
} from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import {
  DDL_PROPERTY_TITLE_ROW_DIFF_KEY,
  DDL_TABLE_CHANGED_PROPERTY_KEYS,
  DdlApiTablePropertyRowDiffs,
} from "@apihub/next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs.types";
import { DdlApiTreeNodeValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value";
import { DdlApiTreeNodeKind } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiTreeNodeMeta } from "@apihub/next-data-model/model/ddlapi/types/node-meta";
import { isObject } from "@apihub/next-data-model/utilities";
import { NodeKey } from "@apihub/next-data-model/utility-types";
import { Diff, DiffType, isDiffAdd, isDiffRemove } from "@netcracker/qubership-apihub-api-diff";
import { DdlApiNodeDiffsAggregatorKindAny } from "./kind-any";

export class DdlApiNodeDiffsAggregatorKindTable extends DdlApiNodeDiffsAggregatorKindAny {
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

    const crawlDiffs = (crawlValue as Record<PropertyKey, unknown>)[diffsMetaKey]
    if (!isObject(crawlDiffs)) {
      return superNodeDiffs
    }

    const diffs = crawlDiffs
    const hasFlatDiffs = Object.values(diffs).some(value => AbstractNodeDiffsAggregator.isDiff(value))
    if (!hasFlatDiffs) {
      return superNodeDiffs
    }

    const nodeDiffs: DdlApiTablePropertyRowDiffs = this.adoptPropertyRowDiffs(
      superNodeDiffs,
      DDL_TABLE_CHANGED_PROPERTY_KEYS,
    )

    this.adoptNodeLevelDiffFromCrawlIfAbsent(
      diffs as Partial<Record<string, Diff>>,
      nodeDiffs,
    )

    const tableNameDiff = diffs['tableName']
    if (AbstractNodeDiffsAggregator.isDiff(tableNameDiff)) {
      this.aggregateTextDiff(
        tableNameDiff,
        'tableName',
        nodeDiffs,
      )
    }

    const schemaNameDiff = diffs['schemaName']
    if (AbstractNodeDiffsAggregator.isDiff(schemaNameDiff)) {
      this.aggregateTextDiff(schemaNameDiff, 'schemaName', nodeDiffs)
    }

    if (this.hasWholeNodeAddOrRemoveDiff(nodeDiffs)) {
      this.aggregatePresentDescriptionFromWholeNodeAddOrRemove(crawlValue, nodeDiffs)
      this.aggregatePropertyTitleRowDiff(nodeDiffs)
      return nodeDiffs
    }

    this.aggregatePropertyTitleRowDiff(nodeDiffs)

    return nodeDiffs
  }

  protected aggregateTextDiff(
    diff: Diff<DiffType>,
    key: 'tableName' | 'schemaName' | 'description',
    nodeDiffs: DdlApiTablePropertyRowDiffs,
  ): void {
    nodeDiffs[key] = key === 'tableName'
      ? this.buildDdlPropertyNameChangedPropertyMetaDataFromDiff(diff)
      : this.buildChangedPropertyMetaDataFromDiff(diff)
  }

  private aggregatePropertyTitleRowDiff(
    nodeDiffs: DdlApiTablePropertyRowDiffs,
  ): void {
    const nodeLevelDiff = nodeDiffs[NODE_LEVEL_DIFF_KEY]
    if (nodeLevelDiff && (isDiffAdd(nodeLevelDiff.data) || isDiffRemove(nodeLevelDiff.data))) {
      nodeDiffs[DDL_PROPERTY_TITLE_ROW_DIFF_KEY] = nodeLevelDiff
      return
    }

    const tableNameDiff = nodeDiffs.tableName
    if (tableNameDiff) {
      nodeDiffs[DDL_PROPERTY_TITLE_ROW_DIFF_KEY] = tableNameDiff
    }
  }
}
