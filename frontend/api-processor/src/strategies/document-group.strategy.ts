/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  BuilderStrategy,
  BuildResult,
  BuildTypeContexts,
  FileFormat,
  OperationsApiType,
  ReducedSourceSpecificationsBuildConfig,
  ResolvedGroupDocument,
  ResolvedReferenceMap,
  VersionDocument,
} from '../types'
import {
  calculateRestOperationId,
  EXPORT_API_TYPE_FORMATS,
  fromBase64,
  isValidHttpMethod,
  normalizeGraphQL,
  takeIfDefined,
  toVersionDocument,
} from '../utils'
import { OpenAPIV3 } from 'openapi-types'
import { VersionRestDocument } from '../apitypes/rest/rest.types'
import { ASYNCAPI_API_TYPE, FILE_FORMAT_JSON, GRAPHQL_API_TYPE, INLINE_REFS_FLAG, NORMALIZE_OPTIONS, REST_API_TYPE } from '../consts'
import { normalize } from '@netcracker/qubership-apihub-api-unifier'
import { extractOperationBasePath } from '@netcracker/qubership-apihub-api-diff'
import { calculateSpecRefs, extractCommonPathItemProperties } from '../apitypes/rest/rest.operation'
import { GraphApiSchema, printGraphApi } from '@netcracker/qubership-apihub-graphapi'
import { createOperationSpec } from '../apitypes/graphql/graphql.operation'
import { parseGraphQLSource } from '../utils/graphql-transformer'

type ApiTypeDocumentTransformer = (document: ResolvedGroupDocument, format: FileFormat, packages: ResolvedReferenceMap) => VersionDocument

const documentTransformers: Record<OperationsApiType, ApiTypeDocumentTransformer | null> = {
  [REST_API_TYPE]: getRestTransformedDocument,
  [GRAPHQL_API_TYPE]: getGraphQLTransformedDocument,
  [ASYNCAPI_API_TYPE]: null,
}

function getTransformedDocument(apiType: OperationsApiType, document: ResolvedGroupDocument, format: FileFormat, packages: ResolvedReferenceMap): VersionDocument {
  const transformer = documentTransformers[apiType]
  if (!transformer) {
    throw new Error(`Document transformation is not supported for API type: ${apiType}`)
  }
  return transformer(document, format, packages)
}

function buildTransformedDocument<T extends VersionDocument>(
  document: ResolvedGroupDocument,
  format: FileFormat,
  packages: ResolvedReferenceMap,
  populateData: (versionDocument: T) => void,
): T {
  const versionDocument = toVersionDocument(document, format) as T
  populateData(versionDocument)
  versionDocument.publish = true
  if (document.packageRef) {
    const { refId } = packages[document.packageRef]
    versionDocument.fileId = `${refId}_${versionDocument.fileId}`
    versionDocument.filename = `${refId}_${versionDocument.filename}`
  }
  return versionDocument
}

function getRestTransformedDocument(document: ResolvedGroupDocument, format: FileFormat, packages: ResolvedReferenceMap): VersionRestDocument {
  return buildTransformedDocument<VersionRestDocument>(document, format, packages, (versionDocument) => {
    const sourceDocument = extractDocumentData(versionDocument)
    versionDocument.data = transformDocumentData(versionDocument)
    const normalizedDocument = normalizeOpenApi(versionDocument.data, sourceDocument)
    calculateSpecRefs(sourceDocument, normalizedDocument, versionDocument.data, versionDocument.operationIds)
  })
}

function getGraphQLTransformedDocument(document: ResolvedGroupDocument, format: FileFormat, packages: ResolvedReferenceMap): VersionDocument<string> {
  return buildTransformedDocument<VersionDocument<string>>(document, format, packages, (versionDocument) => {
    const sourceDocument = extractGraphQLDocumentData(versionDocument)
    const refsOnlyDocument = normalizeGraphQL(sourceDocument)
    const operationsSpec = createOperationSpec(sourceDocument, refsOnlyDocument, versionDocument.operationIds)
    versionDocument.data = printGraphApi(operationsSpec)
  })
}

export class DocumentGroupStrategy implements BuilderStrategy {
  async execute(config: ReducedSourceSpecificationsBuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts): Promise<BuildResult> {
    const { builderContext } = contexts
    const { packageId, version, groupName, apiType = REST_API_TYPE, format = FILE_FORMAT_JSON } = config

    if (!groupName) {
      throw new Error('No group to transform documents for provided')
    }

    if (![REST_API_TYPE, GRAPHQL_API_TYPE].some(type => type === apiType)) {
      throw new Error(`reducedSourceSpecifications transformation is not supported for API type: ${apiType}`)
    }

    const availableFormatsForApiType = EXPORT_API_TYPE_FORMATS.get(apiType)
    const documentFormat = availableFormatsForApiType?.get(format)
    if (!documentFormat) {
      throw new Error(`Export format is not supported: ${format}`)
    }

    const builderContextObject = builderContext(config)

    const { documents, packages } = await builderContextObject.groupDocumentsResolver(
      apiType,
      version,
      packageId,
      groupName,
    ) ?? { documents: [], packages: {} }

    for (const document of documents) {
      const transformedDocument = getTransformedDocument(apiType, document, documentFormat, packages)
      buildResult.documents.set(transformedDocument.fileId, transformedDocument)
    }

    return buildResult
  }
}

function parseBase64String(value: string): unknown {
  return JSON.parse(fromBase64(value))
}

function extractDocumentData(versionDocument: VersionDocument): OpenAPIV3.Document {
  try {
    return parseBase64String(versionDocument.data) as OpenAPIV3.Document
  } catch (e) {
    throw new Error(`Cannot parse data of ${versionDocument.slug} from base64-encoded string`)
  }
}

function extractGraphQLDocumentData(versionDocument: VersionDocument): GraphApiSchema {
  try {
    return parseGraphQLSource(fromBase64(versionDocument.data) as string)
  } catch (e) {
    throw new Error(`Cannot parse GraphQL data of ${versionDocument.slug}: ${e instanceof Error ? e.message : e}`)
  }
}

function transformDocumentData(versionDocument: VersionDocument): OpenAPIV3.Document {
  const sourceDocument = extractDocumentData(versionDocument)
  const normalizedDocument = normalizeOpenApi(sourceDocument)
  const { paths: sourcePaths, components: sourceComponents, ...restOfSource } = sourceDocument
  const { paths: normalizedPaths } = normalizedDocument

  const resultDocument: OpenAPIV3.Document = {
    ...restOfSource,
    paths: {},
  }

  for (const path of Object.keys(normalizedPaths)) {
    const sourcePathItem = sourcePaths[path]
    const normalizedPathItem = normalizedPaths[path]

    if (!isNonNullObject(sourcePathItem) || !isNonNullObject(normalizedPathItem)) {
      continue
    }

    const commonPathItemProperties = extractCommonPathItemProperties(sourcePathItem)

    for (const method of Object.keys(normalizedPathItem)) {
      const httpMethod = method as OpenAPIV3.HttpMethods
      if (!isValidHttpMethod(httpMethod)) continue

      const methodData = normalizedPathItem[httpMethod]
      const basePath = extractOperationBasePath(
        methodData?.servers ||
        sourcePathItem?.servers ||
        sourceDocument?.servers ||
        [],
      )

      const operationId = calculateRestOperationId(basePath, path, method)

      if (!versionDocument.operationIds.includes(operationId)) {
        continue
      }

      if (versionDocument.operationIds.includes(operationId)) {
        const pathData = sourceDocument.paths[path]!
        const isRefPathData = !!pathData.$ref
        resultDocument.paths[path] = isRefPathData
          ? pathData
          : {
            ...resultDocument.paths[path],
            ...commonPathItemProperties,
            [httpMethod]: { ...pathData[httpMethod] },
          }

        resultDocument.components = {
          ...takeIfDefined({ securitySchemes: sourceComponents?.securitySchemes }),
        }
      }
    }
  }

  return resultDocument
}

function normalizeOpenApi(document: OpenAPIV3.Document, source?: OpenAPIV3.Document): OpenAPIV3.Document {
  return normalize(
    document,
    {
      ...NORMALIZE_OPTIONS,
      inlineRefsFlag: INLINE_REFS_FLAG,
      ...(source ? { source } : {}),
    },
  ) as OpenAPIV3.Document
}

function isNonNullObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
