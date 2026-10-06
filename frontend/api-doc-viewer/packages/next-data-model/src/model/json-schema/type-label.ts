import { TYPE_UNKNOWN } from "@apihub/next-data-model/model/abstract/constants"
import {
  JsonSchemaTreeNodeStoredValue,
  JsonSchemaTreeNodeValue,
} from "@apihub/next-data-model/model/json-schema/types/node-value"
import { JsonSchemaTreeNodeMeta } from "@apihub/next-data-model/model/json-schema/types/node-meta"
import { isJsonSchemaPrimitiveNodeValue } from "@apihub/next-data-model/shared/json-schema/guards/schema-value"

const NULLABLE_SUFFIX = " or null"

/**
 * Rendered as `<type>[(<format>)][<<title>>][ or null]`, e.g. `string(date-time)<MyTitle> or null`
 * — format and title are direct suffixes (no separating space); only the nullable suffix is
 * space-separated. Mirrors legacy `NodeType.tsx`.
 */
export function resolveJsonSchemaTypeLabel(
  value: JsonSchemaTreeNodeStoredValue | null | undefined,
  meta: JsonSchemaTreeNodeMeta | null | undefined,
): string {
  if (meta?.brokenRef) {
    return `$ref: ${meta.brokenRef}`
  }

  if (isJsonSchemaPrimitiveNodeValue(value)) {
    return ""
  }

  const typedValue = value as JsonSchemaTreeNodeValue | null | undefined
  const type = typedValue?.type ?? TYPE_UNKNOWN
  const format = typedValue && typeof typedValue === "object" && "format" in typedValue
    ? typedValue.format
    : undefined
  const title = typedValue?.title
  const nullableSuffix = typedValue?.nullable ? NULLABLE_SUFFIX : ""

  let label = String(type)
  if (format) {
    label += `(${format})`
  }
  if (title) {
    label += `<${title}>`
  }
  label += nullableSuffix

  return label
}
