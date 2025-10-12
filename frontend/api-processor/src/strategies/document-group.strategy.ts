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
  ReducedSourceSpecificationsBuildConfig,
  ResolvedGroupDocument,
  ResolvedReferenceMap,
  VersionDocument,
} from '../types'
import { REST_API_TYPE } from '../apitypes'
import {
  calculateOperationId,
  EXPORT_FORMAT_TO_FILE_FORMAT,
  fromBase64,
  isValidHttpMethod,
  takeIfDefined,
  toVersionDocument,
} from '../utils'
import { OpenAPIV3 } from 'openapi-types'
import { VersionRestDocument } from '../apitypes/rest/rest.types'
import { FILE_FORMAT_JSON, INLINE_REFS_FLAG, NORMALIZE_OPTIONS } from '../consts'
import { normalize } from '@netcracker/qubership-apihub-api-unifier'
import { extractOperationBasePath } from '@netcracker/qubership-apihub-api-diff'
import { calculateSpecRefs, extractCommonPathItemProperties } from '../apitypes/rest/rest.operation'

function getTransformedDocument(document: ResolvedGroupDocument, format: FileFormat, packages: ResolvedReferenceMap): VersionRestDocument {
  const versionDocument = toVersionDocument(document, format)

  const sourceDocument = extractDocumentData(versionDocument)
  versionDocument.data = transformDocumentData(versionDocument)
  const normalizedDocument = normalizeOpenApi(versionDocument.data, sourceDocument)
  versionDocument.publish = true

  calculateSpecRefs(sourceDocument, normalizedDocument, versionDocument.data, versionDocument.operationIds)

  // dashboard case
  if (document.packageRef) {
    const { refId } = packages[document.packageRef]
    versionDocument.fileId = `${refId}_${versionDocument.fileId}`
    versionDocument.filename = `${refId}_${versionDocument.filename}`
  }

  return versionDocument
}

export class DocumentGroupStrategy implements BuilderStrategy {
  async execute(config: ReducedSourceSpecificationsBuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts): Promise<BuildResult> {
    const { builderContext } = contexts
    const { packageId, version, groupName, apiType, format = FILE_FORMAT_JSON } = config

    if (!groupName) {
      throw new Error('No group to transform documents for provided')
    }

    if (apiType !== REST_API_TYPE) {
      throw new Error(`API type is not supported: ${apiType}`)
    }

    const documentFormat = EXPORT_FORMAT_TO_FILE_FORMAT.get(format)
    if (!documentFormat) {
      throw new Error(`Export format is not supported: ${format}`)
    }

    const builderContextObject = builderContext(config)

    const { documents, packages } = await builderContextObject.groupDocumentsResolver(
      REST_API_TYPE,
      version,
      packageId,
      groupName,
    ) ?? { documents: [], packages: {} }

    for (const document of documents) {
      const transformedDocument = getTransformedDocument(document, documentFormat, packages)
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

      const operationId = calculateOperationId(basePath, method, path)

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
