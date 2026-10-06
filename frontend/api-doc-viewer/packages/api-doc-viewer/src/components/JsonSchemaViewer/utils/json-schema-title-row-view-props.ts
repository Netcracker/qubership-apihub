import { buildRowDiffProps, toNodeDiffState } from "@apihub/components/shared-components/diffs/node-diff-props"
import { TagsWithDiffsProps } from "@apihub/components/shared-components/diffs/TagsWithDiffs"
import { TitleRowProps } from "@apihub/components/shared-components/TitleRow/types"
import { JsonSchemaRowDiffs } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/tree-with-diffs/property-row-diffs"
import { JsonSchemaTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTreeNodeValue } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/node-value"

/** View-prop builders for the JSON Schema title row's two diff-aware sub-components. */
export class JsonSchemaTitleRowViewProps {
  public static buildTagsProps(
    node: JsonSchemaTreeNodeWithDiffs,
  ): Pick<TagsWithDiffsProps, "requiredChanged" | "requiredDiff" | "readOnlyDiff" | "writeOnlyDiff" | "deprecatedDiff"> {
    // A renamed key keeps the `required` change of the node visible
    const isNodeChanged = !!JsonSchemaRowDiffs.NodeLevel.takeWholeNodeDiff(node)
    const requiredDiff = JsonSchemaRowDiffs.RequiredStar.takeMetaDiff(node)

    return {
      requiredChanged: !isNodeChanged && !!requiredDiff,
      requiredDiff,
      readOnlyDiff: JsonSchemaRowDiffs.MetaFlags.takeReadOnlyDiff(node),
      writeOnlyDiff: JsonSchemaRowDiffs.MetaFlags.takeWriteOnlyDiff(node),
      deprecatedDiff: JsonSchemaRowDiffs.MetaFlags.takeDeprecatedDiff(node),
    }
  }

  public static buildRowDiffProps(
    node: JsonSchemaTreeNodeWithDiffs,
  ): Pick<TitleRowProps, "diff" | "descendantDiffs" | "diffsSeverities"> {
    return buildRowDiffProps<JsonSchemaTreeNodeValue>(toNodeDiffState(node), {
      resolveDiff: () => JsonSchemaRowDiffs.TitleRow.takeDiff(node),
    })
  }
}
