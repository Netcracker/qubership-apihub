import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { JsonSchemaRowDiffs } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/tree-with-diffs/property-row-diffs"
import { JsonSchemaTreeNode, JsonSchemaTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/node-kind"
import { JsonSchemaTreeNodeMeta } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/node-meta"
import { asJsonSchemaTypedNodeValue, isJsonSchemaPrimitiveValueType } from "@netcracker/qubership-apihub-next-data-model/shared/json-schema/guards/schema-value"

/**
 * Generic structural "what kind of node is this" checks, reused across the title, plain-content,
 * and type-value rendering domains. Combiner-specific checks live on {@link JsonSchemaCombiner}
 * (`resolve-combiner.ts`) instead - grouped with the rest of the combiner domain rather than here.
 */
export class JsonSchemaNodeTypeCheckers {
  public static isRootNode(node: JsonSchemaTreeNode): boolean {
    return node.kind === JsonSchemaTreeNodeKinds.ROOT
  }

  /** `additionalProperties`'s own schema node - the one whose parent `propertyNames` constrains it. */
  public static isAdditionalPropertiesNode(node: JsonSchemaTreeNode): boolean {
    return node.kind === JsonSchemaTreeNodeKinds.ADDITIONAL_PROPERTIES
  }

  public static isBooleanAdditionalPropertiesNode(
    node: JsonSchemaTreeNode,
    meta: JsonSchemaTreeNodeMeta | null | undefined,
  ): boolean {
    const fragment = meta?._fragment ?? node.value()
    return this.isAdditionalPropertiesNode(node) && fragment === false
  }

  /**
   * A primitive type (string/number/integer/boolean) has no children, so the nesting-indicator
   * row above a node's children list has nothing to introduce - hide it on that basis.
   */
  public static isNestingIndicatorHiddenForPlainNode(node: JsonSchemaTreeNode): boolean {
    return isJsonSchemaPrimitiveValueType(asJsonSchemaTypedNodeValue(node.value())?.type)
  }

  /** Per-side counterpart of {@link isNestingIndicatorHiddenForPlainNode} for diffed nodes. */
  public static isNestingIndicatorHiddenForSide(
    node: JsonSchemaTreeNodeWithDiffs,
    layoutSide: LayoutSide,
  ): boolean {
    return isJsonSchemaPrimitiveValueType(JsonSchemaRowDiffs.TypeLabel.resolveTypeSideValue(node, layoutSide))
  }
}
