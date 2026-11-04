import { SecuritySpec } from "../../security/security-spec"
import { OpenApiSpecVersion } from "@netcracker/qubership-apihub-api-unifier"
import { BuildingServiceLogger } from "../../../loggers"
import { OPENAPI_PARAMETER_LOCATIONS, OpenApiExternalDocs, OpenApiParameterLocation, OpenApiSynthesizedObjectSchema } from "../../../model/openapi/types/node-value"
import { isSpecificationExtensionKey, SpecificationExtensionKey } from "../../../model/specification-extension-key"
import { isOpenApiHttpMethod, OPEN_API_HTTP_METHODS_ORDER, OpenApiHttpMethod } from "../../../shared/openapi/types/http-method"
import { OpenApiOperationKeys, OpenApiResolvedOperationKeys } from "../../../shared/openapi/types/operation-keys"
import { OpenApiResponseCode, OpenApiResponseCodeClass } from "../../../shared/openapi/types/response-code"
import { isArray, isNonEmptyString, isObject, isString } from "../../../utilities"
import { OpenApiDialect } from "./dialects/dialect"
import { OpenApiDialectResolver } from "./dialects/dialect-resolver"
import { OPENAPI_LOG_PREFIX } from "./log-prefix"
import { OpenApiSecuritySpecBuilder } from "./openapi-security-spec-builder"
import { OpenApiObjectSchemaSynthesizer, OpenApiSchemaEntry } from "./object-schema-synthesizer"

type UnknownRecord = Record<PropertyKey, unknown>

export type OpenApiExtensionsSpec = Record<SpecificationExtensionKey, unknown>

export interface OpenApiParametersSpec {
  location: OpenApiParameterLocation
  schema: OpenApiSynthesizedObjectSchema
  [key: symbol]: unknown
}

export interface OpenApiMediaTypeSpec {
  mediaType: string
  schema?: unknown
  [key: symbol]: unknown
}

export type OpenApiContentSpec = Record<string, OpenApiMediaTypeSpec>

export interface OpenApiRequestBodySpec {
  description?: string
  required?: boolean
  content?: OpenApiContentSpec
  [key: symbol]: unknown
}

export interface OpenApiRequestSpec {
  parameters?: Partial<Record<OpenApiParameterLocation, OpenApiParametersSpec>>
  requestBody?: OpenApiRequestBodySpec
  [key: symbol]: unknown
}

export interface OpenApiResponseHeadersSpec {
  schema: OpenApiSynthesizedObjectSchema
  [key: symbol]: unknown
}

export interface OpenApiResponseSpec {
  code: string
  codeClass: OpenApiResponseCodeClass
  description?: string
  headers?: OpenApiResponseHeadersSpec
  extensions?: OpenApiExtensionsSpec
  content?: OpenApiContentSpec
  [key: symbol]: unknown
}

export interface OpenApiOperationOrientedSpecData {
  security?: SecuritySpec
  extensions?: OpenApiExtensionsSpec
  request?: OpenApiRequestSpec
  responses?: Record<string, OpenApiResponseSpec>
  responsesExtensions?: OpenApiExtensionsSpec
}

export interface OpenApiOperationOrientedSpec {
  id: string
  path: string
  method: OpenApiHttpMethod
  specVersion: OpenApiSpecVersion
  title?: string
  operationId?: string
  description?: string
  externalDocs?: OpenApiExternalDocs
  deprecated?: boolean
  data: OpenApiOperationOrientedSpecData
  [key: symbol]: unknown
}

/** Resolved operation: the inputs every build step needs. */
export type OpenApiOperationContext = {
  readonly source: UnknownRecord
  readonly keys: OpenApiResolvedOperationKeys
  readonly operation: UnknownRecord
  readonly dialect: OpenApiDialect
}

/**
 * OpenAPI document -> operation-oriented spec (the crawl input of `OpenApiTreeBuilder`).
 * Works on normalized documents and on merged `apiDiff` documents alike (a merged document keeps
 * removed values, so the plain transform of it already contains everything of both sides).
 * Design: docs/design/openapi/architecture/data-model-plain.md
 */
export class OpenApiSpecTransformer {
  private securitySpecBuilder?: OpenApiSecuritySpecBuilder

  constructor(protected readonly logger: BuildingServiceLogger) { }

  public transform(source: unknown, operationKeys?: OpenApiOperationKeys): OpenApiOperationOrientedSpec | null {
    const context = this.resolveOperation(source, operationKeys)
    if (!context) {
      return null
    }
    return this.buildSpec(context)
  }

  /* Lookup */

  protected resolveOperation(source: unknown, operationKeys?: OpenApiOperationKeys): OpenApiOperationContext | null {
    if (!isObject(source) || !isString(source.openapi)) {
      this.logger.error(`${OPENAPI_LOG_PREFIX} Source is not an OpenAPI document.`)
      return null
    }
    const dialect = OpenApiDialectResolver.resolve(source)
    if (!dialect) {
      this.logger.error(`${OPENAPI_LOG_PREFIX} Unsupported OpenAPI version: ${source.openapi}`)
      return null
    }
    const keys = this.resolveOperationKeys(source, operationKeys)
    if (!keys) {
      return null
    }
    const pathItem = isObject(source.paths) ? source.paths[keys.path] : undefined
    const operation = isObject(pathItem) ? pathItem[keys.method] : undefined
    if (!isObject(operation)) {
      this.logger.error(`${OPENAPI_LOG_PREFIX} Cannot find operation ${keys.method.toUpperCase()} ${keys.path}`)
      return null
    }
    if (dialect.isResponsesObjectRequired && !isObject(operation.responses)) {
      this.logger.warn(`${OPENAPI_LOG_PREFIX} Operation ${keys.method.toUpperCase()} ${keys.path} has no responses (required in ${dialect.specVersion}).`)
    }
    return { source, keys, operation, dialect }
  }

  protected resolveOperationKeys(source: UnknownRecord, operationKeys?: OpenApiOperationKeys): OpenApiResolvedOperationKeys | null {
    if (operationKeys) {
      const method = operationKeys.method.toLowerCase()
      if (!isOpenApiHttpMethod(method)) {
        this.logger.error(`${OPENAPI_LOG_PREFIX} Unknown HTTP method: ${operationKeys.method}`)
        return null
      }
      return { path: operationKeys.path, method }
    }
    this.logger.error(`${OPENAPI_LOG_PREFIX} Operation keys are not provided. Looking for the first operation in source...`)
    const paths = isObject(source.paths) ? source.paths : {}
    for (const path of Object.keys(paths)) {
      const pathItem = paths[path]
      if (!isObject(pathItem)) {
        continue
      }
      const method = OPEN_API_HTTP_METHODS_ORDER.find(candidate => isObject(pathItem[candidate]))
      if (method) {
        return { path, method }
      }
    }
    this.logger.error(`${OPENAPI_LOG_PREFIX} Cannot find any operation in source.`)
    return null
  }

  /* Spec */

  protected buildSpec(context: OpenApiOperationContext): OpenApiOperationOrientedSpec {
    const { operation, keys, dialect } = context
    const spec: OpenApiOperationOrientedSpec = {
      id: `${keys.method.toUpperCase()} ${keys.path}`,
      path: keys.path,
      method: keys.method,
      specVersion: dialect.specVersion,
      ...(isString(operation.summary) ? { title: operation.summary } : {}),
      ...(isString(operation.operationId) ? { operationId: operation.operationId } : {}),
      ...(isString(operation.description) ? { description: operation.description } : {}),
      ...this.pickExternalDocs(operation.externalDocs),
      ...(typeof operation.deprecated === 'boolean' ? { deprecated: operation.deprecated } : {}),
      data: {},
    }
    const security = this.buildSecurity(context)
    const extensions = this.copyExtensions(operation)
    const request = this.buildRequest(context)
    const responsesExtensions = isObject(operation.responses) ? this.copyExtensions(operation.responses) : undefined
    const responses = this.buildResponses(context, responsesExtensions !== undefined)
    spec.data = {
      ...(security ? { security } : {}),
      ...(extensions ? { extensions } : {}),
      ...(request ? { request } : {}),
      ...(responses ? { responses } : {}),
      ...(responsesExtensions ? { responsesExtensions } : {}),
    }
    return spec
  }

  protected pickExternalDocs(externalDocs: unknown): Pick<OpenApiOperationOrientedSpec, 'externalDocs'> {
    if (!isObject(externalDocs) || !isString(externalDocs.url)) {
      return {}
    }
    return {
      externalDocs: {
        url: externalDocs.url,
        ...(isString(externalDocs.description) ? { description: externalDocs.description } : {}),
      },
    }
  }

  /* Security */

  /** The Security section: built by the API type's security spec builder (created once per transformer). */
  protected buildSecurity(context: OpenApiOperationContext): SecuritySpec | undefined {
    this.securitySpecBuilder ??= this.createSecuritySpecBuilder()
    return this.securitySpecBuilder.build(context)
  }

  protected createSecuritySpecBuilder(): OpenApiSecuritySpecBuilder {
    return new OpenApiSecuritySpecBuilder(this.logger)
  }

  /* Request */

  protected buildRequest(context: OpenApiOperationContext): OpenApiRequestSpec | undefined {
    const parameters = this.buildParameterGroups(context)
    const requestBody = this.buildRequestBody(context)
    if (!parameters && !requestBody) {
      return undefined
    }
    return {
      ...(parameters ? { parameters } : {}),
      ...(requestBody ? { requestBody } : {}),
    }
  }

  protected collectParameterEntries(context: OpenApiOperationContext): Map<OpenApiParameterLocation, OpenApiSchemaEntry[]> {
    const groups = new Map<OpenApiParameterLocation, OpenApiSchemaEntry[]>()
    const parameters = context.operation.parameters
    if (!isArray(parameters)) {
      return groups
    }
    parameters.forEach((parameter, index) => {
      if (!isObject(parameter) || !isString(parameter.name)) {
        return
      }
      const location = OPENAPI_PARAMETER_LOCATIONS.find(candidate => candidate === parameter.in)
      if (!location) {
        this.logger.warn(`${OPENAPI_LOG_PREFIX} Parameter '${parameter.name}' has unsupported location '${String(parameter.in)}'.`)
        return
      }
      const entries = groups.get(location) ?? []
      entries.push({ name: parameter.name, value: parameter, recordKey: index })
      groups.set(location, entries)
    })
    return groups
  }

  protected buildParameterGroups(context: OpenApiOperationContext): Partial<Record<OpenApiParameterLocation, OpenApiParametersSpec>> | undefined {
    const groups = this.collectParameterEntries(context)
    const result: Partial<Record<OpenApiParameterLocation, OpenApiParametersSpec>> = {}
    for (const location of OPENAPI_PARAMETER_LOCATIONS) {
      const entries = groups.get(location)
      if (!entries || entries.length === 0) {
        continue
      }
      result[location] = { location, schema: this.synthesizeParameters(context, entries) }
    }
    return Object.keys(result).length > 0 ? result : undefined
  }

  protected synthesizeParameters(
    context: OpenApiOperationContext,
    entries: readonly OpenApiSchemaEntry[],
  ): OpenApiSynthesizedObjectSchema {
    return this.createSchemaSynthesizer().synthesize(entries)
  }

  protected createSchemaSynthesizer(): OpenApiObjectSchemaSynthesizer {
    return new OpenApiObjectSchemaSynthesizer()
  }

  protected buildRequestBody(context: OpenApiOperationContext): OpenApiRequestBodySpec | undefined {
    const requestBody = context.operation.requestBody
    if (!isObject(requestBody)) {
      return undefined
    }
    const content = this.buildContent(requestBody.content, [requestBody])
    const description = isNonEmptyString(requestBody.description) ? requestBody.description : undefined
    if (!content && !description) {
      return undefined
    }
    return {
      ...(description !== undefined ? { description } : {}),
      ...(typeof requestBody.required === 'boolean' ? { required: requestBody.required } : {}),
      ...(content ? { content } : {}),
    }
  }

  /**
   * Media types with a `schema` (a media type without one is not content). Extensions of the
   * Media Type Object and of `extensionOwners` (the Request Body Object) are cloned flat into the
   * schema root; precedence: media type > owners > schema root.
   */
  protected buildContent(content: unknown, extensionOwners: readonly UnknownRecord[]): OpenApiContentSpec | undefined {
    if (!isObject(content)) {
      return undefined
    }
    const result: OpenApiContentSpec = {}
    for (const mediaType of Object.keys(content)) {
      const mediaTypeObject = content[mediaType]
      if (!isObject(mediaTypeObject) || mediaTypeObject.schema === undefined) {
        continue
      }
      result[mediaType] = {
        mediaType,
        schema: this.cloneExtensionsIntoSchema(mediaTypeObject.schema, [mediaTypeObject, ...extensionOwners]),
      }
    }
    return Object.keys(result).length > 0 ? result : undefined
  }

  /** `owners` in precedence order, highest first. */
  protected cloneExtensionsIntoSchema(schema: unknown, owners: readonly UnknownRecord[]): unknown {
    const extensions: UnknownRecord = {}
    for (const owner of [...owners].reverse()) {
      Object.assign(extensions, this.copyExtensions(owner) ?? {})
    }
    if (Object.keys(extensions).length === 0 || schema === false) {
      return schema
    }
    const base: UnknownRecord = isObject(schema) ? { ...schema } : {}
    return Object.assign(base, extensions)
  }

  /* Responses */

  protected buildResponses(context: OpenApiOperationContext, hasResponsesExtensions: boolean): Record<string, OpenApiResponseSpec> | undefined {
    const responses = context.operation.responses
    if (!isObject(responses)) {
      return undefined
    }
    // Document order: the spec object cannot hold the canonical order (integer-like keys enumerate
    // first); the tree builder sorts the response options (`OpenApiResponseCode.compare`).
    const codes = Object.keys(responses).filter(code => !isSpecificationExtensionKey(code))
    const result: Record<string, OpenApiResponseSpec> = {}
    for (const code of codes) {
      const response = responses[code]
      if (isObject(response)) {
        result[code] = this.buildResponse(context, code, response)
      }
    }
    return Object.keys(result).length > 0 || hasResponsesExtensions ? result : undefined
  }

  protected buildResponse(context: OpenApiOperationContext, code: string, response: UnknownRecord): OpenApiResponseSpec {
    const headers = this.buildResponseHeaders(context, code, response)
    const extensions = this.copyExtensions(response)
    const content = this.buildContent(response.content, [])
    return {
      code,
      codeClass: OpenApiResponseCode.resolveClass(code),
      ...(isString(response.description) ? { description: response.description } : {}),
      ...(headers ? { headers } : {}),
      ...(extensions ? { extensions } : {}),
      ...(content ? { content } : {}),
    }
  }

  protected collectHeaderEntries(response: UnknownRecord): OpenApiSchemaEntry[] {
    const headers = response.headers
    if (!isObject(headers)) {
      return []
    }
    return Object.keys(headers)
      .filter(name => !isSpecificationExtensionKey(name))
      .flatMap(name => {
        const header = headers[name]
        return isObject(header) ? [{ name, value: header, recordKey: name }] : []
      })
  }

  protected buildResponseHeaders(
    context: OpenApiOperationContext,
    code: string,
    response: UnknownRecord,
  ): OpenApiResponseHeadersSpec | undefined {
    const entries = this.collectHeaderEntries(response)
    if (entries.length === 0) {
      return undefined
    }
    return { schema: this.createSchemaSynthesizer().synthesize(entries) }
  }

  /* Helpers */

  protected copyExtensions(source: UnknownRecord): OpenApiExtensionsSpec | undefined {
    const keys = Object.keys(source).filter(isSpecificationExtensionKey)
    if (keys.length === 0) {
      return undefined
    }
    return keys.reduce<OpenApiExtensionsSpec>((extensions, key) => {
      extensions[key] = source[key]
      return extensions
    }, {})
  }
}
