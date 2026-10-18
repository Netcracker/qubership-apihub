import { JsonSchemaTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/node-kind"

// FIXME 18.06.24 // Workaround restored from the legacy viewer: get rid of it when hosts can describe media types in the schema
/** Root's direct property key -> media type, shown as a badge in the property's title row. */
export type TopLevelPropsMediaTypesMap = Record<string, string>

/** Design: docs/design/json-schema/features/top-level-props-media-types.md */
export class JsonSchemaTopLevelPropsMediaTypes {
  /** Media type of a root's direct property listed in `mediaTypes`; nested properties never match. */
  public static resolve(
    node: JsonSchemaTreeNode,
    mediaTypes: TopLevelPropsMediaTypesMap | undefined,
  ): string | undefined {
    if (!mediaTypes || node.kind !== JsonSchemaTreeNodeKinds.PROPERTY) {
      return undefined
    }
    if (node.parent?.kind !== JsonSchemaTreeNodeKinds.ROOT) {
      return undefined
    }
    const key = String(node.key)
    return Object.hasOwn(mediaTypes, key) ? mediaTypes[key] : undefined
  }
}
