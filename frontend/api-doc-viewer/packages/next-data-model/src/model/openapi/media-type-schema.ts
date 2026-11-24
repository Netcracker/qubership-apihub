import { SectionRowDiffs } from "../abstract/tree-with-diffs/row-diffs-base"
import { isObjective } from "../../utilities"
import { OpenApiDisplayLabels } from "./display/labels"
import { OpenApiTreeNode, OpenApiTreeNodeWithDiffs } from "./types/aliases"

type AnyOpenApiNode = OpenApiTreeNode | OpenApiTreeNodeWithDiffs

/**
 * The schema a media type (Body option) shows in its nested JSON Schema viewer: wrapped under a
 * synthetic `Type` property (AsyncAPI parity), so the schema's type is the viewer's first row. With
 * diffs, the wrapper carries the record that paints `Type` as the media type's whole add / remove —
 * the same diff its option and the Body edges use (inherited from a wholly added / removed owner
 * included). Design: docs/design/openapi/entities/request-body.md -> "Body".
 */
export class OpenApiMediaTypeSchema {
  /** The media type's own schema, when it has one to show (an object; `true` / `false` schemas are prepared as objects). */
  public static take(mediaType: AnyOpenApiNode): Record<PropertyKey, unknown> | undefined {
    const schema: unknown = Reflect.get(mediaType.value() ?? {}, 'schema')
    return isObjective(schema) ? schema : undefined
  }

  public static has(mediaType: AnyOpenApiNode): boolean {
    return OpenApiMediaTypeSchema.take(mediaType) !== undefined
  }

  /**
   * The wrapped schema for the nested viewer; `diffsMetaKey` (diffs trees) adds the `Type` record.
   * A new object per call: callers memoise it per selected media type.
   */
  public static wrap(mediaType: AnyOpenApiNode, diffsMetaKey?: symbol): object | undefined {
    const schema = OpenApiMediaTypeSchema.take(mediaType)
    if (!schema) {
      return undefined
    }
    const title = OpenApiDisplayLabels.WRAPPED_BODY_SCHEMA_TITLE
    const diff = diffsMetaKey ? SectionRowDiffs.takeHeaderRowDiff(mediaType)?.data : undefined
    return {
      type: 'object',
      properties: {
        [title]: schema,
        ...(diff && diffsMetaKey ? { [diffsMetaKey]: { [title]: diff } } : {}),
      },
    }
  }
}
