import { aggregateDiffsWithRollup, Diff, DiffAction } from "@netcracker/qubership-apihub-api-diff"
import { BuildingServiceLogger } from "../../../loggers"
import { NODE_LEVEL_DIFF_KEY } from "../../../model/abstract/tree-with-diffs/tree-node.interface"
import { OPENAPI_RESPONSE_OPTIONS_DIFF_KEY } from "../../../model/openapi/tree-with-diffs/diff-keys"
import { OPENAPI_PARAMETER_LOCATIONS, OpenApiParameterLocation, OpenApiSynthesizedObjectSchema } from "../../../model/openapi/types/node-value"
import { OpenApiOperationKeys } from "../../../shared/openapi/types/operation-keys"
import { OpenApiResponseCode } from "../../../shared/openapi/types/response-code"
import { DiffsRecord, isNonEmptyString, isObject } from "../../../utilities"
import { DiffMetaKeys } from "../../abstract/tree-with-diffs/node-diffs-data/diff-meta-keys"
import { FieldSides, SideContext, SideContexts, SideReader } from "../../shared/side-reader"
import { OpenApiObjectSchemaWithDiffsSynthesizer } from "./object-schema-with-diffs-synthesizer"
import { OpenApiSchemaEntry } from "./object-schema-synthesizer"
import { OpenApiContentWithDiffsDecorator } from "./openapi-content-with-diffs-decorator"
import { OpenApiDiffsOperationFactsResolver } from "./openapi-diffs-operation-facts"
import { OpenApiSectionPresence } from "./openapi-section-presence"
import { OpenApiSecuritySpecWithDiffsBuilder } from "./openapi-security-spec-with-diffs-builder"
import { OpenApiExtensionsSpec, OpenApiOperationContext, OpenApiOperationOrientedSpec, OpenApiParametersSpec, OpenApiRequestBodySpec, OpenApiRequestSpec, OpenApiResponseHeadersSpec, OpenApiResponseSpec, OpenApiSpecTransformer } from "./openapi-spec-transformer"

type UnknownRecord = Record<PropertyKey, unknown>

/** Operation fields whose raw diffs move onto the operation node unchanged (source key -> value prop). */
const OPERATION_FIELD_DIFFS: ReadonlyArray<readonly [string, string]> = [
  ['summary', 'title'],
  ['operationId', 'operationId'],
  ['description', 'description'],
  ['externalDocs', 'externalDocs'],
]

/** Operation-level sections that get a whole-section diff from their presence. */
const OPERATION_SECTION_KEYS = ['security', 'extensions', 'request', 'responses', 'responsesExtensions'] as const

/**
 * Merged `apiDiff` document -> operation-oriented spec with diff records attached for the
 * OpenAPI layer. Child-section diffs live in the parent's own record under the child key (where
 * record-driven node-diffs inheritance reads them); synthetic whole-section diffs come from presence per side.
 * Collaborators: operation facts (`OpenApiDiffsOperationFactsResolver`), section presence
 * (`OpenApiSectionPresence`), body content (`OpenApiContentWithDiffsDecorator`). No per-operation
 * state lives on the transformer: every step reads the facts of the context it is given.
 * Design: docs/design/openapi/features/diffs.md
 */
export class OpenApiSpecWithDiffsTransformer extends OpenApiSpecTransformer {
  private readonly reader: SideReader
  private readonly operationFacts: OpenApiDiffsOperationFactsResolver
  private readonly presence: OpenApiSectionPresence
  private readonly content: OpenApiContentWithDiffsDecorator

  constructor(logger: BuildingServiceLogger, private readonly diffMetaKeys: DiffMetaKeys) {
    super(logger)
    this.reader = new SideReader(diffMetaKeys.diffsMetaKey)
    this.operationFacts = new OpenApiDiffsOperationFactsResolver(this.reader)
    this.presence = new OpenApiSectionPresence(this.reader)
    this.content = new OpenApiContentWithDiffsDecorator(this.reader)
  }

  public override transform(source: unknown, operationKeys?: OpenApiOperationKeys): OpenApiOperationOrientedSpec | null {
    const spec = super.transform(source, operationKeys)
    if (!spec) {
      return null
    }
    // IMPORTANT: roll diffs up on the TRANSFORMED spec, so relocated and synthetic records count.
    aggregateDiffsWithRollup(spec, this.diffMetaKeys.diffsMetaKey, this.diffMetaKeys.aggregatedDiffsMetaKey)
    return spec
  }

  /* Operation */

  protected override buildSpec(context: OpenApiOperationContext): OpenApiOperationOrientedSpec {
    const spec = super.buildSpec(context)
    const facts = this.operationFacts.resolve(context)
    const operationRecord = this.reader.record(context.operation) ?? {}
    const rootRecord: DiffsRecord = {}
    if (facts.wholeDiff) {
      rootRecord[NODE_LEVEL_DIFF_KEY] = facts.wholeDiff
    }
    for (const [sourceKey, targetKey] of OPERATION_FIELD_DIFFS) {
      const diff = operationRecord[sourceKey]
      if (diff) {
        rootRecord[targetKey] = diff
      }
    }
    const deprecatedDiff = this.reader.normalizeFlagDiff(this.reader.readField(context.operation, 'deprecated', facts.sides))
    if (deprecatedDiff) {
      rootRecord.deprecated = deprecatedDiff
    }
    if (facts.addressDiff) {
      rootRecord.path = facts.addressDiff
    }
    const nestedExternalDocsDiff = this.resolveNestedExternalDocsDiff(context.operation, facts.sides)
    if (!rootRecord.externalDocs && nestedExternalDocsDiff) {
      rootRecord.externalDocs = nestedExternalDocsDiff
    }
    this.reader.writeRecord(spec, rootRecord)

    // Operation extensions
    if (spec.data.extensions) {
      this.decorateExtensions(spec.data.extensions, context.operation, facts.sides, facts.wholeDiff)
    }
    // Responses extensions
    if (spec.data.responsesExtensions) {
      this.decorateExtensions(spec.data.responsesExtensions, context.operation.responses, this.reader.childContext(facts.responsesField), facts.wholeDiff)
    }
    if (spec.data.responses) {
      const codesPresence = this.presence.of(spec.data.responses)
      const extensionsPresence = spec.data.responsesExtensions ? this.presence.of(spec.data.responsesExtensions) : SideContexts.NONE
      this.presence.set(spec.data.responses, SideContexts.union(codesPresence, extensionsPresence))
    }

    for (const sectionKey of OPERATION_SECTION_KEYS) {
      const section = spec.data[sectionKey]
      if (section) {
        this.presence.writeSectionDiff(spec, sectionKey, section, facts.wholeDiff, undefined, sectionKey === 'responses' ? facts.responsesField.diff : undefined)
      }
    }
    return spec
  }

  /**
   * `externalDocs.url` / `.description` changed inside an existing object: one replace of the whole
   * external docs value carrying both sides (the link text is static; the row needs per-side values).
   */
  private resolveNestedExternalDocsDiff(operation: UnknownRecord, operationSides: SideContext): Diff | undefined {
    const externalDocsField = this.reader.readField(operation, 'externalDocs', operationSides)
    if (!externalDocsField.beforePresent || !externalDocsField.afterPresent) {
      return undefined
    }
    const context = this.reader.childContext(externalDocsField)
    const url = this.reader.readField(operation.externalDocs, 'url', context)
    const description = this.reader.readField(operation.externalDocs, 'description', context)
    if (!url.diff && !description.diff) {
      return undefined
    }
    return this.reader.createDiff(
      DiffAction.replace,
      {
        beforeValue: { url: url.before, description: description.before },
        afterValue: { url: url.after, description: description.after },
      },
      [url.diff, description.diff],
    )
  }

  /* Security */

  protected override createSecuritySpecBuilder(): OpenApiSecuritySpecWithDiffsBuilder {
    return new OpenApiSecuritySpecWithDiffsBuilder(this.logger, {
      reader: this.reader,
      operationFacts: this.operationFacts,
      presence: this.presence,
    })
  }

  /* Request */

  protected override buildRequest(context: OpenApiOperationContext): OpenApiRequestSpec | undefined {
    const request = super.buildRequest(context)
    if (!request) {
      return undefined
    }
    const facts = this.operationFacts.resolve(context)
    let presence = SideContexts.NONE
    for (const location of OPENAPI_PARAMETER_LOCATIONS) {
      const group = request.parameters?.[location]
      if (group) {
        this.presence.writeSectionDiff(request, location, group, facts.wholeDiff)
        presence = SideContexts.union(presence, this.presence.of(group))
      }
    }
    if (request.requestBody) {
      this.presence.writeSectionDiff(request, 'requestBody', request.requestBody, facts.wholeDiff, undefined, facts.requestBodyField.diff)
      presence = SideContexts.union(presence, this.presence.of(request.requestBody))
    }
    this.presence.set(request, presence)
    return request
  }

  protected override buildParameterGroups(context: OpenApiOperationContext): Partial<Record<OpenApiParameterLocation, OpenApiParametersSpec>> | undefined {
    const groups = super.buildParameterGroups(context)
    if (!groups) {
      return undefined
    }
    const parametersContext = this.reader.childContext(this.operationFacts.resolve(context).parametersField)
    const entriesByLocation = this.collectParameterEntries(context)
    for (const location of OPENAPI_PARAMETER_LOCATIONS) {
      const group = groups[location]
      if (group) {
        this.presence.set(group, this.entriesPresence(entriesByLocation.get(location) ?? [], context.operation.parameters, parametersContext))
      }
    }
    return groups
  }

  protected override synthesizeParameters(context: OpenApiOperationContext, entries: readonly OpenApiSchemaEntry[]): OpenApiSynthesizedObjectSchema {
    const facts = this.operationFacts.resolve(context)
    return this.createSchemaWithDiffsSynthesizer().synthesizeWithDiffs(entries, {
      owner: context.operation.parameters,
      context: this.reader.childContext(facts.parametersField),
      inheritedWholeDiff: facts.wholeDiff ?? this.wholeDiffOf(facts.parametersField),
    })
  }

  protected override buildRequestBody(context: OpenApiOperationContext): OpenApiRequestBodySpec | undefined {
    const requestBodySpec = super.buildRequestBody(context)
    const requestBody = context.operation.requestBody
    if (!requestBodySpec || !isObject(requestBody)) {
      return requestBodySpec
    }
    const facts = this.operationFacts.resolve(context)
    const requestBodyContext = this.reader.childContext(facts.requestBodyField)
    const record = this.reader.record(requestBody) ?? {}
    const requestBodyRecord: DiffsRecord = {}
    if (record.description) {
      requestBodyRecord.description = record.description
    }
    const requiredDiff = this.reader.normalizeFlagDiff(this.reader.readField(requestBody, 'required', requestBodyContext))
    if (requiredDiff) {
      requestBodyRecord.required = requiredDiff
    }

    const descriptionField = this.reader.readField(requestBody, 'description', requestBodyContext)
    let presence: SideContext = {
      before: descriptionField.beforePresent && isNonEmptyString(descriptionField.before),
      after: descriptionField.afterPresent && isNonEmptyString(descriptionField.after),
    }
    if (requestBodySpec.content) {
      const contentField = this.reader.readField(requestBody, 'content', requestBodyContext)
      const optionsPresence = this.content.decorate(requestBodySpec.content, requestBody.content, this.reader.childContext(contentField), [
        { owner: requestBody, context: requestBodyContext },
      ], contentField.diff, requestBodyRecord)
      presence = SideContexts.union(presence, optionsPresence)
      this.presence.writeSectionDiff(requestBodySpec, 'content', requestBodySpec.content, facts.wholeDiff, optionsPresence, contentField.diff)
    }
    this.reader.writeRecord(requestBodySpec, requestBodyRecord)
    this.presence.set(requestBodySpec, presence)
    return requestBodySpec
  }

  /* Responses */

  protected override buildResponses(context: OpenApiOperationContext, hasResponsesExtensions: boolean): Record<string, OpenApiResponseSpec> | undefined {
    const responsesSpec = super.buildResponses(context, hasResponsesExtensions)
    const responses = context.operation.responses
    if (!responsesSpec || !isObject(responses)) {
      return responsesSpec
    }
    const responsesContext = this.reader.childContext(this.operationFacts.resolve(context).responsesField)
    const responsesRecord: DiffsRecord = {}
    let presence = SideContexts.NONE
    for (const code of Object.keys(responsesSpec)) {
      const responseField = this.readResponseField(responses, code, responsesContext)
      presence = SideContexts.union(presence, this.reader.childContext(responseField))
      const diff = responseField.diff
      if (SideReader.isWholeChangeOrRename(diff)) {
        responsesRecord[code] = diff
      }
    }
    this.reader.writeOptionsDiff(responsesRecord, OPENAPI_RESPONSE_OPTIONS_DIFF_KEY, { ...responsesRecord }, SideReader.isWholeChangeOrRename)
    this.reader.writeRecord(responsesSpec, responsesRecord)
    this.presence.set(responsesSpec, presence)
    return responsesSpec
  }

  protected override buildResponse(context: OpenApiOperationContext, code: string, response: UnknownRecord): OpenApiResponseSpec {
    const responseSpec = super.buildResponse(context, code, response)
    const { wholeDiff } = this.operationFacts.resolve(context)
    const responseContext = this.responseContext(context, code)
    const responseRecord: DiffsRecord = {}
    const description = this.reader.record(response)?.description
    if (description) {
      responseRecord.description = description
    }
    this.reader.writeRecord(responseSpec, responseRecord)
    if (responseSpec.headers) {
      const headersField = this.reader.readField(response, 'headers', responseContext)
      this.presence.writeSectionDiff(responseSpec, 'headers', responseSpec.headers, wholeDiff, undefined, headersField.diff)
    }
    if (responseSpec.extensions) {
      this.decorateExtensions(responseSpec.extensions, response, responseContext, wholeDiff)
      this.presence.writeSectionDiff(responseSpec, 'extensions', responseSpec.extensions, wholeDiff)
    }
    if (responseSpec.content) {
      const contentField = this.reader.readField(response, 'content', responseContext)
      const optionsPresence = this.content.decorate(responseSpec.content, response.content, this.reader.childContext(contentField), [], contentField.diff)
      this.presence.writeSectionDiff(responseSpec, 'content', responseSpec.content, wholeDiff, optionsPresence, contentField.diff)
    }
    return responseSpec
  }

  protected override buildResponseHeaders(context: OpenApiOperationContext, code: string, response: UnknownRecord): OpenApiResponseHeadersSpec | undefined {
    const entries = this.collectHeaderEntries(response)
    if (entries.length === 0) {
      return undefined
    }
    const facts = this.operationFacts.resolve(context)
    const responseContext = this.responseContext(context, code)
    const headersField = this.reader.readField(response, 'headers', responseContext)
    const headersContext = this.reader.childContext(headersField)
    const responseField = this.responseField(context, code)
    const inheritedWholeDiff = facts.wholeDiff
      ?? this.wholeDiffOf(facts.responsesField)
      ?? this.wholeDiffOf(responseField)
      ?? this.wholeDiffOf(headersField)
    const headers: OpenApiResponseHeadersSpec = {
      schema: this.createSchemaWithDiffsSynthesizer().synthesizeWithDiffs(entries, { owner: response.headers, context: headersContext, inheritedWholeDiff }),
    }
    this.presence.set(headers, this.entriesPresence(entries, response.headers, headersContext))
    return headers
  }

  private responseField(context: OpenApiOperationContext, code: string): FieldSides {
    const { responsesField } = this.operationFacts.resolve(context)
    return this.readResponseField(context.operation.responses, code, this.reader.childContext(responsesField))
  }

  /**
   * `apiDiff` keys a removed range code's diff by its normalized lowercase spelling (`5xx`), while the
   * merged document keeps the original key (`5XX`): fall back to the diff of another spelling of the
   * same range unless that spelling is a response of its own.
   */
  private readResponseField(responses: unknown, code: string, context: SideContext): FieldSides {
    const field = this.reader.readField(responses, code, context)
    if (field.diff || !OpenApiResponseCode.isRange(code) || !isObject(responses)) {
      return field
    }
    const diffKey = Object.keys(this.reader.record(responses) ?? {})
      .find(key => key !== code && key.toLowerCase() === code.toLowerCase() && !(key in responses))
    return diffKey === undefined ? field : this.reader.readField(responses, code, context, diffKey)
  }

  private responseContext(context: OpenApiOperationContext, code: string): SideContext {
    return this.reader.childContext(this.responseField(context, code))
  }

  /* Shared */

  /** Copies the owner's `x-*` diffs onto the extensions map and records its presence (≥1 key). */
  private decorateExtensions(extensions: OpenApiExtensionsSpec, owner: unknown, ownerContext: SideContext, operationWholeDiff: Diff | undefined): void {
    const record: DiffsRecord = {}
    let presence = SideContexts.NONE
    const ownerRecord = this.reader.record(owner) ?? {}
    for (const key of Object.keys(extensions)) {
      const field = this.reader.readField(owner, key, ownerContext)
      presence = SideContexts.union(presence, this.reader.childContext(field))
      const diff = ownerRecord[key]
      if (diff) {
        record[key] = diff
      } else if (field.beforePresent !== field.afterPresent) {
        // The owner (operation, response, ...) exists on one side only: the separate JSO tree needs
        // per-key diffs to show the value on that side only.
        record[key] = this.reader.diffPresence(this.reader.childContext(field), field.beforePresent ? field.before : field.after, [operationWholeDiff])
      }
    }
    this.reader.writeRecord(extensions, record)
    this.presence.set(extensions, presence)
  }

  private entriesPresence(entries: readonly OpenApiSchemaEntry[], owner: unknown, ownerContext: SideContext): SideContext {
    return SideContexts.union(...entries.map(entry => this.reader.childContext(this.reader.readField(owner, entry.recordKey, ownerContext))))
  }

  private wholeDiffOf(field: FieldSides): Diff | undefined {
    return SideReader.isWholeChange(field.diff) ? field.diff : undefined
  }

  private createSchemaWithDiffsSynthesizer(): OpenApiObjectSchemaWithDiffsSynthesizer {
    return new OpenApiObjectSchemaWithDiffsSynthesizer(this.reader)
  }
}
