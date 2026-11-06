import { isSpecificationExtensionKey } from "../../../model/specification-extension-key"
import { OpenApiSynthesizedObjectSchema } from "../../../model/openapi/types/node-value"
import { isNonEmptyString, isObject } from "../../../utilities"

/** One parameter (from a `parameters` array) or one header (from a `headers` map). */
export type OpenApiSchemaEntry = {
  /** Property key: the parameter `name` or the header map key. */
  readonly name: string
  /** The Parameter / Header Object (merged object in diffs mode). */
  readonly value: Record<PropertyKey, unknown>
  /** Index in the merged `parameters` array, or the header name - the key of its diff record. */
  readonly recordKey: PropertyKey
}

export const MEDIA_TYPE_CUSTOM_ANNOTATION_KEY = 'mediaType'
export const MEDIA_TYPE_CUSTOM_ANNOTATION_LABEL = 'Media type'
export const CUSTOM_ANNOTATIONS_KEY = 'customAnnotations'

/**
 * Builds one JSON Schema object from parameters or headers: one property per entry.
 * See docs/design/openapi/entities/parameters.md -> "Schema synthesizer".
 */
export class OpenApiObjectSchemaSynthesizer {
  public synthesize(entries: readonly OpenApiSchemaEntry[]): OpenApiSynthesizedObjectSchema {
    const schema: OpenApiSynthesizedObjectSchema = { type: 'object', properties: {}, required: [] }
    for (const entry of entries) {
      schema.properties[entry.name] = this.buildProperty(entry)
      if (entry.value.required === true) {
        schema.required.push(entry.name)
      }
    }
    return schema
  }

  protected buildProperty(entry: OpenApiSchemaEntry): unknown {
    const { schema, mediaType } = this.resolveSchemaSource(entry.value)
    const property = this.toObjectSchema(schema)
    if (property === false) {
      return false
    }
    const { description, deprecated } = entry.value
    if (isNonEmptyString(description)) {
      property.description = description
    }
    if (deprecated === true) {
      property.deprecated = true
    }
    for (const key of Object.keys(entry.value)) {
      if (isSpecificationExtensionKey(key)) {
        property[key] = entry.value[key]
      }
    }
    if (mediaType !== undefined) {
      property[CUSTOM_ANNOTATIONS_KEY] = {
        [MEDIA_TYPE_CUSTOM_ANNOTATION_KEY]: { label: MEDIA_TYPE_CUSTOM_ANNOTATION_LABEL, value: mediaType },
      }
    }
    return property
  }

  /** `schema`, else the single `content` entry's schema; the media type when described by `content`. */
  protected resolveSchemaSource(entry: Record<PropertyKey, unknown>): { schema: unknown, mediaType?: string } {
    if (entry.schema !== undefined) {
      return { schema: entry.schema }
    }
    const content = entry.content
    if (isObject(content)) {
      const [mediaType] = Object.keys(content)
      if (mediaType !== undefined) {
        const mediaTypeObject = content[mediaType]
        return { schema: isObject(mediaTypeObject) ? mediaTypeObject.schema : undefined, mediaType }
      }
    }
    return { schema: undefined }
  }

  /**
   * A shallow copy that can receive keys without mutating the (possibly shared) source schema.
   * OAS 3.1 boolean `true` is the empty schema; `false` cannot hold keys and is kept as is.
   */
  protected toObjectSchema(schema: unknown): Record<PropertyKey, unknown> | false {
    if (schema === false) {
      return false
    }
    if (isObject(schema)) {
      return { ...schema }
    }
    return {}
  }
}
