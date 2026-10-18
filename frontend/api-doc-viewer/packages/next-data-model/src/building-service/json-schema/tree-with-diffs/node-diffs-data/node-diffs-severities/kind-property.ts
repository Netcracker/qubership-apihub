import { AbstractNodeDiffsSeveritiesAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-severities-aggregator"
import {
  NodeDiffs,
  NodeDiffsSeverities,
  NodeDiffsSeverityPlacemennt,
} from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { JsonSchemaKindPropertyNodeDiffs } from "@apihub/next-data-model/model/json-schema/tree-with-diffs/property-row-diffs.types"
import { JsonSchemaTreeNodeStoredValue } from "@apihub/next-data-model/model/json-schema/types/node-value"
import { JsonSchemaNodeDiffsSeveritiesAggregatorKindAny } from "./kind-any"

export class JsonSchemaNodeDiffsSeveritiesAggregatorKindProperty
  extends JsonSchemaNodeDiffsSeveritiesAggregatorKindAny {

  public aggregate(
    nodeDiffs: NodeDiffs<JsonSchemaTreeNodeStoredValue | null>,
  ): NodeDiffsSeverities | undefined {
    const diffsSeverities = super.aggregate(nodeDiffs) ?? {}
    this.applyDefaultRowSeverity(nodeDiffs, diffsSeverities)
    this.applyEnumRowSeverity(nodeDiffs, diffsSeverities)
    this.applyExamplesRowSeverity(nodeDiffs, diffsSeverities)
    this.applyAllowedAdditionalPropertyNamesRowSeverity(nodeDiffs, diffsSeverities)
    return Object.keys(diffsSeverities).length > 0 ? diffsSeverities : undefined
  }

  /** `Default` row severity is independent of `Allowed values` / `Examples` / validation rows. */
  private applyDefaultRowSeverity(
    nodeDiffs: NodeDiffs<JsonSchemaTreeNodeStoredValue | null>,
    diffsSeverities: NodeDiffsSeverities,
  ): void {
    const propertyDiffs = nodeDiffs as JsonSchemaKindPropertyNodeDiffs
    const maxRowDiff = AbstractNodeDiffsSeveritiesAggregator.maxChangedPropertyMetaDataByDiffType(
      propertyDiffs.default,
      propertyDiffs.defaultRowColorizingDiff,
    )
    if (!maxRowDiff) {
      return
    }

    diffsSeverities[NodeDiffsSeverityPlacemennt.DefaultRow] = this.buildNodeDiffsSeverity(maxRowDiff)
  }

  /** `Allowed values` row severity is independent of `Default` / `Examples` / validation rows. */
  private applyEnumRowSeverity(
    nodeDiffs: NodeDiffs<JsonSchemaTreeNodeStoredValue | null>,
    diffsSeverities: NodeDiffsSeverities,
  ): void {
    const propertyDiffs = nodeDiffs as JsonSchemaKindPropertyNodeDiffs
    const maxRowDiff = AbstractNodeDiffsSeveritiesAggregator.maxChangedPropertyMetaDataByDiffType(
      propertyDiffs.enumDiff,
      propertyDiffs.enumRowColorizingDiff,
      ...Object.values(propertyDiffs.enumValueDiffs ?? {}),
    )
    if (!maxRowDiff) {
      return
    }

    diffsSeverities[NodeDiffsSeverityPlacemennt.EnumRow] = this.buildNodeDiffsSeverity(maxRowDiff)
  }

  /** `Examples` row severity is independent of `Default` / `Allowed values` / validation rows. */
  private applyExamplesRowSeverity(
    nodeDiffs: NodeDiffs<JsonSchemaTreeNodeStoredValue | null>,
    diffsSeverities: NodeDiffsSeverities,
  ): void {
    const propertyDiffs = nodeDiffs as JsonSchemaKindPropertyNodeDiffs
    const maxRowDiff = AbstractNodeDiffsSeveritiesAggregator.maxChangedPropertyMetaDataByDiffType(
      propertyDiffs.examplesDiff,
      propertyDiffs.examplesRowColorizingDiff,
      ...Object.values(propertyDiffs.examplesValueDiffs ?? {}),
    )
    if (!maxRowDiff) {
      return
    }

    diffsSeverities[NodeDiffsSeverityPlacemennt.ExamplesRow] = this.buildNodeDiffsSeverity(maxRowDiff)
  }

  /**
   * `Allowed additional property names` row severity is independent of `Default` / `Allowed
   * values` / `Examples` / validation rows - only ever set on the `additionalProperties` child.
   */
  private applyAllowedAdditionalPropertyNamesRowSeverity(
    nodeDiffs: NodeDiffs<JsonSchemaTreeNodeStoredValue | null>,
    diffsSeverities: NodeDiffsSeverities,
  ): void {
    const propertyDiffs = nodeDiffs as JsonSchemaKindPropertyNodeDiffs
    const maxRowDiff = AbstractNodeDiffsSeveritiesAggregator.maxChangedPropertyMetaDataByDiffType(
      propertyDiffs.allowedAdditionalPropertyNamesDiff,
      propertyDiffs.allowedAdditionalPropertyNamesRowColorizingDiff,
      ...Object.values(propertyDiffs.allowedAdditionalPropertyNamesValueDiffs ?? {}),
    )
    if (!maxRowDiff) {
      return
    }

    diffsSeverities[NodeDiffsSeverityPlacemennt.AllowedAdditionalPropertyNamesRow] = this.buildNodeDiffsSeverity(maxRowDiff)
  }
}
