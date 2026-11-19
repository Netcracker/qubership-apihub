import { Diff, DiffAction, isDiffReplace } from "@netcracker/qubership-apihub-api-diff"
import { isSpecificationExtensionKey } from "../../../model/specification-extension-key"
import { OpenApiSynthesizedObjectSchema } from "../../../model/openapi/types/node-value"
import { DiffsRecord, isNonEmptyString, isObject, isString } from "../../../utilities"
import {
  CUSTOM_ANNOTATIONS_KEY,
  MEDIA_TYPE_CUSTOM_ANNOTATION_KEY,
  MEDIA_TYPE_CUSTOM_ANNOTATION_LABEL,
  OpenApiObjectSchemaSynthesizer,
  OpenApiSchemaEntry,
} from "./object-schema-synthesizer"
import { DiffSide } from "../../../model/abstract/diff-side"
import { FieldSides, SideContext, SideReader } from "../../shared/side-reader"

type UnknownRecord = Record<PropertyKey, unknown>

export type OpenApiSynthesisContainer = {
  /** The merged array (parameters) or map (headers) holding the entries; its record keys entries. */
  readonly owner: unknown
  /** Side context of `owner`. */
  readonly context: SideContext
  /** Whole add / remove of an ancestor (operation, parameters array, headers map, response) to stamp on every entry. */
  readonly inheritedWholeDiff?: Diff
}

/** Where a property's schema comes from on one side. */
type SchemaSource = {
  readonly mediaType?: string
  /** The schema field, reconstructed per side. */
  readonly field: FieldSides
  /** Merged schema object of this source. */
  readonly merged: unknown
}

const DESCRIPTION_KEY = 'description'
const DEPRECATED_KEY = 'deprecated'
const RESERVED_SCHEMA_KEYS: ReadonlySet<string> = new Set([DESCRIPTION_KEY, CUSTOM_ANNOTATIONS_KEY])

/**
 * Synthesizes parameters / headers into a JSON Schema object and writes JSON Schema diff records
 * onto it, so `JsonSchemaDiffsViewer` paints every change without help from the OpenAPI viewer.
 * Design: docs/design/openapi/entities/parameters.md -> "With diffs", "Description and schema sources",
 * "Entry extensions".
 */
export class OpenApiObjectSchemaWithDiffsSynthesizer extends OpenApiObjectSchemaSynthesizer {
  constructor(private readonly reader: SideReader) {
    super()
  }

  public synthesizeWithDiffs(entries: readonly OpenApiSchemaEntry[], container: OpenApiSynthesisContainer): OpenApiSynthesizedObjectSchema {
    const schema: OpenApiSynthesizedObjectSchema = { type: 'object', properties: {}, required: [] }
    const propertiesRecord: DiffsRecord = {}
    const requiredRecord: DiffsRecord = {}

    for (const entry of entries) {
      const entryField = this.reader.readField(container.owner, entry.recordKey, container.context)
      const entryContext = this.reader.childContext(entryField)
      schema.properties[entry.name] = this.buildPropertyWithDiffs(entry, entryContext)

      const wholeDiff = container.inheritedWholeDiff ?? (SideReader.isWholeChange(entryField.diff) ? entryField.diff : undefined)
      const renameDiff = this.resolveRenameDiff(entry, entryContext)
      const propertyDiff = wholeDiff ?? renameDiff
      if (propertyDiff) {
        propertiesRecord[entry.name] = propertyDiff
      }

      const requiredField = this.reader.readField(entry.value, 'required', entryContext)
      const beforeRequired = requiredField.beforePresent && requiredField.before === true
      const afterRequired = requiredField.afterPresent && requiredField.after === true
      if (!beforeRequired && !afterRequired) {
        continue
      }
      const requiredIndex = schema.required.length
      schema.required.push(entry.name)
      // A whole entry add / remove already paints the required star; only a change of an existing entry is a required diff.
      if (entryContext.before && entryContext.after && beforeRequired !== afterRequired && !container.inheritedWholeDiff) {
        requiredRecord[String(requiredIndex)] = afterRequired
          ? this.reader.createDiff(DiffAction.add, { afterValue: entry.name }, [requiredField.diff])
          : this.reader.createDiff(DiffAction.remove, { beforeValue: entry.name }, [requiredField.diff])
      }
    }

    this.reader.writeRecord(schema.properties, propertiesRecord)
    this.reader.writeRecord(schema.required, requiredRecord)
    return schema
  }

  /** `apiDiff` maps path parameters by template position: a changed `name` is a property key rename. */
  private resolveRenameDiff(entry: OpenApiSchemaEntry, entryContext: SideContext): Diff | undefined {
    const nameField = this.reader.readField(entry.value, 'name', entryContext)
    const nameDiff = nameField.diff
    if (!nameDiff || !isDiffReplace(nameDiff) || !isString(nameDiff.beforeValue) || !isString(nameDiff.afterValue)) {
      return undefined
    }
    return {
      type: nameDiff.type,
      scope: nameDiff.scope,
      ...(nameDiff.description !== undefined ? { description: nameDiff.description } : {}),
      action: DiffAction.rename,
      beforeKey: nameDiff.beforeValue,
      afterKey: nameDiff.afterValue,
      beforeDeclarationPaths: nameDiff.beforeDeclarationPaths,
      afterDeclarationPaths: nameDiff.afterDeclarationPaths,
    }
  }

  private buildPropertyWithDiffs(entry: OpenApiSchemaEntry, entryContext: SideContext): unknown {
    const entryValue = entry.value
    const sourceBefore = this.resolveSchemaSourceOnSide(entryValue, entryContext, 'before')
    const sourceAfter = this.resolveSchemaSourceOnSide(entryValue, entryContext, 'after')
    // A wholly added / removed entry exists on one side only: nothing switched, its own diff covers it.
    const isSameSource = !entryContext.before || !entryContext.after || this.isSameSource(sourceBefore, sourceAfter)

    const property = isSameSource
      ? this.toObjectSchema((sourceAfter ?? sourceBefore)?.merged)
      : this.mergeSchemaSources(sourceBefore, sourceAfter)
    if (property === false) {
      return false
    }

    const rootValue = (key: string, side: DiffSide): unknown => {
      const source = side === 'before' ? sourceBefore : sourceAfter
      if (!source) {
        return undefined
      }
      const sourceSchema = side === 'before' ? source.field.before : source.field.after
      if (isSameSource) {
        const rootField = this.reader.readField(source.merged, key, this.reader.childContext(source.field))
        return side === 'before' ? rootField.before : rootField.after
      }
      return isObject(sourceSchema) ? sourceSchema[key] : undefined
    }

    // Description: entry description wins over the schema root; the diff is computed from the SHOWN values.
    this.applyShownValue(property, DESCRIPTION_KEY, entryValue, entryContext, rootValue, isSameSource, value => (isNonEmptyString(value) ? value : undefined))
    // Deprecated flag: same precedence; absent = false.
    this.applyShownFlag(property, entryValue, entryContext, rootValue, isSameSource)
    // Extensions: entry-level x-* moved flat into the property; entry wins over the schema root.
    const extensionKeys = new Set<string>([
      ...Object.keys(entryValue).filter(isSpecificationExtensionKey),
      ...this.collectRootExtensionKeys(sourceBefore, sourceAfter, isSameSource),
    ])
    for (const key of extensionKeys) {
      this.applyShownValue(property, key, entryValue, entryContext, rootValue, isSameSource, value => value)
    }
    // Media type of a `content`-described entry.
    this.applyMediaTypeAnnotation(property, sourceBefore?.mediaType, sourceAfter?.mediaType, [sourceBefore?.field.diff, sourceAfter?.field.diff])
    return property
  }

  private resolveSchemaSourceOnSide(entry: UnknownRecord, entryContext: SideContext, side: DiffSide): SchemaSource | undefined {
    const schemaField = this.reader.readField(entry, 'schema', entryContext)
    if (side === 'before' ? schemaField.beforePresent : schemaField.afterPresent) {
      return { field: schemaField, merged: entry.schema }
    }
    const contentField = this.reader.readField(entry, 'content', entryContext)
    const content = entry.content
    if (!isObject(content)) {
      return undefined
    }
    const contentContext = this.reader.childContext(contentField)
    for (const mediaType of Object.keys(content)) {
      const mediaTypeField = this.reader.readField(content, mediaType, contentContext)
      if (!(side === 'before' ? mediaTypeField.beforePresent : mediaTypeField.afterPresent)) {
        continue
      }
      const mediaTypeObject = content[mediaType]
      const mediaTypeSchemaField = this.reader.readField(mediaTypeObject, 'schema', this.reader.childContext(mediaTypeField))
      const causes = mediaTypeSchemaField.diff ?? mediaTypeField.diff ?? contentField.diff
      return {
        mediaType,
        field: { ...mediaTypeSchemaField, diff: causes },
        merged: isObject(mediaTypeObject) ? mediaTypeObject.schema : undefined,
      }
    }
    return undefined
  }

  /** Same schema object on both sides and not replaced as a whole: inner diffs pass through. */
  private isSameSource(before: SchemaSource | undefined, after: SchemaSource | undefined): boolean {
    if (!before || !after) {
      return !before && !after
    }
    const isReplacedAsWhole = before.field.diff !== undefined && isDiffReplace(before.field.diff)
    return before.mediaType === after.mediaType && before.merged === after.merged && !isReplacedAsWhole
  }

  /**
   * Different sources (`schema` <-> `content`, media type A -> B): shallow per-key comparison of the
   * two side schemas; nested diffs of either source are dropped (accepted v1 precision).
   */
  private mergeSchemaSources(before: SchemaSource | undefined, after: SchemaSource | undefined): UnknownRecord | false {
    const beforeSchema = before?.field.before
    const afterSchema = after?.field.after
    if (afterSchema === false && beforeSchema === undefined) {
      return false
    }
    const beforeObject: UnknownRecord = isObject(beforeSchema) ? beforeSchema : {}
    const afterObject: UnknownRecord = isObject(afterSchema) ? afterSchema : {}
    const property: UnknownRecord = {}
    const record: DiffsRecord = {}
    const causes = [before?.field.diff, after?.field.diff]
    const keys = new Set([...Object.keys(afterObject), ...Object.keys(beforeObject)])
    for (const key of keys) {
      const isAfter = key in afterObject
      property[key] = isAfter ? afterObject[key] : beforeObject[key]
      if (RESERVED_SCHEMA_KEYS.has(key) || isSpecificationExtensionKey(key)) {
        continue
      }
      const diff = this.reader.diffShownValues(beforeObject[key], afterObject[key], causes)
      if (diff) {
        record[key] = diff
      }
    }
    this.reader.writeRecord(property, record)
    return property
  }

  private collectRootExtensionKeys(before: SchemaSource | undefined, after: SchemaSource | undefined, isSameSource: boolean): string[] {
    const keys = new Set<string>()
    for (const source of [before, after]) {
      const schema = isSameSource ? source?.merged : source === before ? source?.field.before : source?.field.after
      if (isObject(schema)) {
        Object.keys(schema).filter(isSpecificationExtensionKey).forEach(key => keys.add(key))
      }
    }
    return [...keys]
  }

  /**
   * `shown(side) = entry[key](side) ?? schemaRoot[key](side)`; writes the shown value and the diff of
   * the shown values. Keys living on the schema root only (same source) are left untouched.
   */
  private applyShownValue(
    property: UnknownRecord,
    key: string,
    entry: UnknownRecord,
    entryContext: SideContext,
    rootValue: (key: string, side: DiffSide) => unknown,
    isSameSource: boolean,
    normalize: (value: unknown) => unknown,
  ): void {
    const entryField = this.reader.readField(entry, key, entryContext)
    const entryHasKey = entryField.beforePresent || entryField.afterPresent
    if (!entryHasKey && isSameSource) {
      return
    }
    const shownBefore = normalize(entryField.before) ?? normalize(rootValue(key, 'before'))
    const shownAfter = normalize(entryField.after) ?? normalize(rootValue(key, 'after'))
    const rootDiff = this.reader.record(property)?.[key]
    const diff = this.reader.diffShownValues(shownBefore, shownAfter, [entryField.diff, rootDiff])
    const shown = shownAfter ?? shownBefore
    if (shown === undefined) {
      delete property[key]
    } else {
      property[key] = shown
    }
    this.reader.replaceRecordEntry(property, key, diff)
  }

  private applyShownFlag(
    property: UnknownRecord,
    entry: UnknownRecord,
    entryContext: SideContext,
    rootValue: (key: string, side: DiffSide) => unknown,
    isSameSource: boolean,
  ): void {
    const entryField = this.reader.readField(entry, DEPRECATED_KEY, entryContext)
    const entryHasFlag = entryField.beforePresent || entryField.afterPresent
    if (!entryHasFlag && isSameSource) {
      return
    }
    const shownBefore = (entryField.beforePresent ? entryField.before : rootValue(DEPRECATED_KEY, 'before')) === true
    const shownAfter = (entryField.afterPresent ? entryField.after : rootValue(DEPRECATED_KEY, 'after')) === true
    if (shownBefore || shownAfter) {
      property[DEPRECATED_KEY] = shownAfter
    } else {
      delete property[DEPRECATED_KEY]
    }
    const diff = shownBefore === shownAfter
      ? undefined
      : this.reader.createDiff(DiffAction.replace, { beforeValue: shownBefore, afterValue: shownAfter }, [entryField.diff])
    this.reader.replaceRecordEntry(property, DEPRECATED_KEY, diff)
  }

  private applyMediaTypeAnnotation(property: UnknownRecord, before: string | undefined, after: string | undefined, causes: readonly (Diff | undefined)[]): void {
    const shown = after ?? before
    if (shown === undefined) {
      return
    }
    const annotation: UnknownRecord = { label: MEDIA_TYPE_CUSTOM_ANNOTATION_LABEL, value: shown }
    const annotations: UnknownRecord = { [MEDIA_TYPE_CUSTOM_ANNOTATION_KEY]: annotation }
    property[CUSTOM_ANNOTATIONS_KEY] = annotations
    if (before === after) {
      return
    }
    if (before !== undefined && after !== undefined) {
      this.reader.writeDiff(annotation, 'value', this.reader.createDiff(DiffAction.replace, { beforeValue: before, afterValue: after }, causes))
      return
    }
    const diff = after !== undefined
      ? this.reader.createDiff(DiffAction.add, { afterValue: annotation }, causes)
      : this.reader.createDiff(DiffAction.remove, { beforeValue: annotation }, causes)
    this.reader.writeDiff(annotations, MEDIA_TYPE_CUSTOM_ANNOTATION_KEY, diff)
  }
}
