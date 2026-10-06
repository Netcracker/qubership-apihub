import { AbstractNodeDiffsSeveritiesAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-severities-aggregator"
import {
  ChangedPropertyMetaData,
  NODE_LEVEL_DIFF_KEY,
  NodeDiffs,
  NodeDiffsSeverities,
  NodeDiffsSeverity,
  NodeDiffsSeverityPlacemennt,
} from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import {
  JSON_SCHEMA_TITLE_ROW_DIFF_KEY,
  JsonSchemaKindAnyNodeDiffs,
  JsonSchemaSharedRowDiffs,
} from "@apihub/next-data-model/model/json-schema/tree-with-diffs/property-row-diffs.types"
import { JsonSchemaTreeNodeStoredValue } from "@apihub/next-data-model/model/json-schema/types/node-value"
import {
  JSON_SCHEMA_VALIDATION_ROW_SEVERITY_PLACEMENTS,
  JsonSchemaValidationRowKeys,
} from "@apihub/next-data-model/model/json-schema/tree-with-diffs/validation-row-source-keys"
import { isDiffAdd, isDiffRemove, isDiffRename, isDiffReplace } from "@netcracker/qubership-apihub-api-diff"

export class JsonSchemaNodeDiffsSeveritiesAggregatorKindAny
  extends AbstractNodeDiffsSeveritiesAggregator<JsonSchemaTreeNodeStoredValue | null> {

  public aggregate(
    nodeDiffs: NodeDiffs<JsonSchemaTreeNodeStoredValue | null>,
  ): NodeDiffsSeverities | undefined {
    // A renamed key is not a whole-node change: the rename is badged on the title row only (via
    // the title-row diff, see `applyMaxRowSeverityFromTypeLabelDiffs`), other rows keep their own
    const nodeLevelDiff = nodeDiffs[NODE_LEVEL_DIFF_KEY]
    const diffNode = nodeLevelDiff && !isDiffRename(nodeLevelDiff.data) ? nodeLevelDiff : undefined
    const diffsSeverities: NodeDiffsSeverities = {}

    if (diffNode) {
      diffsSeverities[NodeDiffsSeverityPlacemennt.TitleRow] = this.buildNodeDiffsSeverity(diffNode)
      diffsSeverities[NodeDiffsSeverityPlacemennt.DescriptionRow] = this.buildNodeDiffsSeverity(diffNode)
      diffsSeverities[NodeDiffsSeverityPlacemennt.NestingIndicatorRow] = this.buildNodeDiffsSeverity(diffNode)
      diffsSeverities[NodeDiffsSeverityPlacemennt.ExtensionsRow] = this.buildNodeDiffsSeverity(diffNode)
      diffsSeverities[NodeDiffsSeverityPlacemennt.CustomAnnotationRow] = this.buildNodeDiffsSeverity(diffNode)
    } else {
      this.applyMaxRowSeverityFromTypeLabelDiffs(nodeDiffs, diffsSeverities)
      this.applyRowSeverity(nodeDiffs, "description", NodeDiffsSeverityPlacemennt.DescriptionRow, diffsSeverities)
      this.applyRowSeverity(
        nodeDiffs,
        "nestingIndicatorRowColorizingDiff",
        NodeDiffsSeverityPlacemennt.NestingIndicatorRow,
        diffsSeverities,
      )
      this.applyRowSeverity(
        nodeDiffs,
        "extensionsRowColorizingDiff",
        NodeDiffsSeverityPlacemennt.ExtensionsRow,
        diffsSeverities,
      )
      this.applyCustomAnnotationsRowSeverity(nodeDiffs, diffsSeverities)
    }

    this.applyValidationRowSeverities(nodeDiffs, diffsSeverities)

    return Object.keys(diffsSeverities).length > 0 ? diffsSeverities : undefined
  }

  /**
   * Floating diff badge for each validation-constraint row, computed independently per row key
   * for every node kind - not just property/root - so combiner-variant nodes get the same
   * severity indicators as a top-level property. A change to one constraint (e.g. `minLength`)
   * must not paint the badge on unrelated rows (e.g. `Value range`), so each row key gets its
   * own {@link NodeDiffsSeverityPlacemennt} slot instead of one shared max across every row.
   * Property/root nodes extend this with default/enum/examples severities in
   * {@link JsonSchemaNodeDiffsSeveritiesAggregatorKindProperty}.
   */
  private applyValidationRowSeverities(
    nodeDiffs: NodeDiffs<JsonSchemaTreeNodeStoredValue | null>,
    diffsSeverities: NodeDiffsSeverities,
  ): void {
    const validationDiffs = nodeDiffs as JsonSchemaKindAnyNodeDiffs
    for (const rowKey of Object.values(JsonSchemaValidationRowKeys)) {
      const maxRowDiff = AbstractNodeDiffsSeveritiesAggregator.maxChangedPropertyMetaDataByDiffType(
        validationDiffs.validationRowDiffs?.[rowKey],
        validationDiffs.validationRowColorizingDiffs?.[rowKey],
        ...Object.values(validationDiffs.validationRowValueDiffs?.[rowKey] ?? {}),
      )
      if (!maxRowDiff) {
        continue
      }

      diffsSeverities[JSON_SCHEMA_VALIDATION_ROW_SEVERITY_PLACEMENTS[rowKey]] = this.buildNodeDiffsSeverity(maxRowDiff)
    }
  }

  /**
   * Floating diff badge for the generic `customAnnotations` extension point, shared across every
   * entry on the node (accepted v1 limitation - see `NodeDiffsSeverityPlacemennt.CustomAnnotationRow`
   * doc comment - a future spec needing 2+ independently-badged custom-annotation rows on the same
   * node would need dedicated per-key placements instead).
   */
  private applyCustomAnnotationsRowSeverity(
    nodeDiffs: NodeDiffs<JsonSchemaTreeNodeStoredValue | null>,
    diffsSeverities: NodeDiffsSeverities,
  ): void {
    const customAnnotationDiffs = nodeDiffs as JsonSchemaKindAnyNodeDiffs
    const maxRowDiff = AbstractNodeDiffsSeveritiesAggregator.maxChangedPropertyMetaDataByDiffType(
      ...Object.values(customAnnotationDiffs.customAnnotationDiffs ?? {}),
      ...Object.values(customAnnotationDiffs.customAnnotationRowColorizingDiffs ?? {}),
    )
    if (!maxRowDiff) {
      return
    }
    diffsSeverities[NodeDiffsSeverityPlacemennt.CustomAnnotationRow] = this.buildNodeDiffsSeverity(maxRowDiff)
  }

  private applyMaxRowSeverityFromTypeLabelDiffs(
    nodeDiffs: NodeDiffs<JsonSchemaTreeNodeStoredValue | null>,
    diffsSeverities: NodeDiffsSeverities,
  ): void {
    const sharedDiffs = nodeDiffs as JsonSchemaSharedRowDiffs
    const titleRowDiffs = [
      sharedDiffs[JSON_SCHEMA_TITLE_ROW_DIFF_KEY],
      ...Object.values(sharedDiffs.typeLabelFieldDiffs ?? {}),
    ]

    const maxPropertyDiff = AbstractNodeDiffsSeveritiesAggregator.maxChangedPropertyMetaDataByDiffType(
      ...titleRowDiffs,
    )
    if (!maxPropertyDiff) {
      return
    }

    diffsSeverities[NodeDiffsSeverityPlacemennt.TitleRow] = this.buildNodeDiffsSeverity(maxPropertyDiff)
  }

  protected buildNodeDiffsSeverity(propertyDiff: ChangedPropertyMetaData): NodeDiffsSeverity {
    const diff = propertyDiff.data
    const nodeDiffsSeverity: NodeDiffsSeverity = {
      type: diff.type,
      causedAt: [],
    }
    if (isDiffRemove(diff) || isDiffReplace(diff) || isDiffRename(diff)) {
      nodeDiffsSeverity.causedAt = diff.beforeDeclarationPaths[0]
    } else if (isDiffAdd(diff)) {
      nodeDiffsSeverity.causedAt = diff.afterDeclarationPaths[0]
    }
    return nodeDiffsSeverity
  }

  protected applyRowSeverity(
    nodeDiffs: NodeDiffs<JsonSchemaTreeNodeStoredValue | null>,
    propertyKey: string,
    placement: NodeDiffsSeverityPlacemennt,
    diffsSeverities: NodeDiffsSeverities,
  ): void {
    const propertyDiff = (nodeDiffs as Record<string, ChangedPropertyMetaData | undefined>)[propertyKey]
    if (!propertyDiff) {
      return
    }
    diffsSeverities[placement] = this.buildNodeDiffsSeverity(propertyDiff)
  }
}
