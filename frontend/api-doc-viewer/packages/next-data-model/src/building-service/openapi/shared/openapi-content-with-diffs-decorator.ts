import { Diff } from "@netcracker/qubership-apihub-api-diff"
import { OPENAPI_MEDIA_TYPE_OPTIONS_DIFF_KEY } from "../../../model/openapi/tree-with-diffs/diff-keys"
import { isSpecificationExtensionKey } from "../../../model/specification-extension-key"
import { DiffsRecord, isObject } from "../../../utilities"
import { SideContext, SideContexts, SideReader } from "../../shared/side-reader"
import { OpenApiContentSpec, OpenApiMediaTypeSpec } from "./openapi-spec-transformer"

type UnknownRecord = Record<PropertyKey, unknown>

/** An object whose `x-*` are cloned into a media-type schema root, and the sides where it exists. */
export type ExtensionOwnerSides = {
  readonly owner: UnknownRecord
  readonly context: SideContext
}

/**
 * Diff records of one body `content` map (request or response Body): its media-type options and
 * the `x-*` cloned into each media type's schema root.
 * Design: docs/design/openapi/entities/request-body.md -> "Extensions", features/diffs.md.
 */
export class OpenApiContentWithDiffsDecorator {
  constructor(private readonly reader: SideReader) { }

  /**
   * Options are media types with a schema: option presence = schema presence. Writes option diffs
   * (raw add / remove / rename, else synthetic from schema presence) and the diffs of extensions
   * cloned into the schema root. Returns the presence of "≥1 option".
   * A wholly added / removed or renamed option writes the synthetic media-type options diff of the
   * Body header row into `headerRecord` (the request body's record), else into the content's own
   * record (the response Body header is painted by its `content` node).
   */
  public decorate(
    contentSpec: OpenApiContentSpec,
    content: unknown,
    contentContext: SideContext,
    owners: readonly ExtensionOwnerSides[],
    contentDiff: Diff | undefined,
    headerRecord?: DiffsRecord,
  ): SideContext {
    let presence = SideContexts.NONE
    const contentRecord: DiffsRecord = {}
    for (const mediaType of Object.keys(contentSpec)) {
      const mediaTypeSpec = contentSpec[mediaType]
      const mediaTypeObject = isObject(content) ? content[mediaType] : undefined
      if (!isObject(mediaTypeObject)) {
        continue
      }
      const mediaTypeField = this.reader.readField(content, mediaType, contentContext)
      const mediaTypeContext = this.reader.childContext(mediaTypeField)
      const schemaField = this.reader.readField(mediaTypeObject, 'schema', mediaTypeContext)
      const optionPresence = this.reader.childContext(schemaField)
      presence = SideContexts.union(presence, optionPresence)
      const rawDiff = mediaTypeField.diff
      const optionDiff = SideReader.isWholeChangeOrRename(rawDiff)
        ? rawDiff
        : this.reader.diffPresence(optionPresence, mediaTypeSpec, [schemaField.diff, rawDiff, contentDiff])
      if (optionDiff) {
        contentRecord[mediaType] = optionDiff
      }
      this.decorateClonedExtensions(mediaTypeSpec, mediaTypeObject, [{ owner: mediaTypeObject, context: mediaTypeContext }, ...owners], optionPresence)
    }
    this.reader.writeOptionsDiff(headerRecord ?? contentRecord, OPENAPI_MEDIA_TYPE_OPTIONS_DIFF_KEY, { ...contentRecord }, SideReader.isWholeChangeOrRename)
    this.reader.writeRecord(contentSpec, contentRecord)
    return presence
  }

  /** Per-key precedence: owners in order (media type, request body), then the schema root. */
  private decorateClonedExtensions(
    mediaTypeSpec: OpenApiMediaTypeSpec,
    mediaTypeObject: UnknownRecord,
    owners: readonly ExtensionOwnerSides[],
    schemaContext: SideContext,
  ): void {
    const keys = new Set<string>()
    for (const { owner } of owners) {
      Object.keys(owner).filter(isSpecificationExtensionKey).forEach(key => keys.add(key))
    }
    if (keys.size === 0 || !isObject(mediaTypeSpec.schema)) {
      return
    }
    if (mediaTypeSpec.schema === mediaTypeObject.schema) {
      mediaTypeSpec.schema = { ...mediaTypeSpec.schema }
    }
    const schema = mediaTypeSpec.schema
    if (!isObject(schema)) {
      return
    }
    const rawSchema = mediaTypeObject.schema
    for (const key of keys) {
      const fields = owners.map(({ owner, context }) => this.reader.readField(owner, key, SideContexts.intersect(context, schemaContext)))
      const rootField = this.reader.readField(rawSchema, key, schemaContext)
      const shownBefore = [...fields, rootField].find(field => field.beforePresent)?.before
      const shownAfter = [...fields, rootField].find(field => field.afterPresent)?.after
      const shown = shownAfter ?? shownBefore
      if (shown !== undefined) {
        schema[key] = shown
      }
      const diff = schemaContext.before && schemaContext.after
        ? this.reader.diffShownValues(shownBefore, shownAfter, [...fields, rootField].map(field => field.diff))
        : undefined
      this.reader.replaceRecordEntry(schema, key, diff)
    }
  }
}
