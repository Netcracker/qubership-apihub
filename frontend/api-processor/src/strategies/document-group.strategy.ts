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
  BuildConfig,
  BuilderStrategy,
  BuildResult,
  BuildTypeContexts,
  FileFormat,
  JSON_EXPORT_GROUP_FORMAT,
  ResolvedDocument,
  VersionDocument,
} from '../types'
import { REST_API_TYPE } from '../apitypes'
import {
  EXPORT_FORMAT_TO_FILE_FORMAT,
  fromBase64,
  getDocumentTitle,
  getFileExtension,
  removeFirstSlash,
  slugify,
  takeIfDefined,
  toVersionDocument,
} from '../utils'
import { OpenAPIV3 } from 'openapi-types'
import { getOperationBasePath } from '../apitypes/rest/rest.utils'
import { VersionRestDocument } from '../apitypes/rest/rest.types'
import { INLINE_REFS_FLAG, NORMALIZE_OPTIONS } from '../consts'
import { normalize } from '@netcracker/qubership-apihub-api-unifier'
import { calculateSpecRefs, extractCommonPathItemProperties } from '../apitypes/rest/rest.operation'
import { groupBy } from 'graphql/jsutils/groupBy'

async function getTransformedDocument(document: ResolvedDocument, format: FileFormat): Promise<VersionRestDocument> {
  const versionDocument = toVersionDocument(document, format)

  const source = extractDocumentData(versionDocument)
  versionDocument.data = await transformDocumentData(versionDocument)
  const normalizedDocument = normalize(
    versionDocument.data,
    {
      ...NORMALIZE_OPTIONS,
      inlineRefsFlag: INLINE_REFS_FLAG,
      source,
    },
  ) as OpenAPIV3.Document
  versionDocument.publish = true

  calculateSpecRefs(source, normalizedDocument, versionDocument.data)

  return versionDocument
}

export class DocumentGroupStrategy implements BuilderStrategy {
  async execute(config: BuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts): Promise<BuildResult> {
    const { builderContext } = contexts
    const { packageId, version, groupName, apiType, format = JSON_EXPORT_GROUP_FORMAT } = config

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

    const { documents } = await builderContextObject.versionDocumentsResolver(
      apiType,
      version,
      packageId,
      groupName,
    ) ?? { documents: [] }

    const transformTasks = []

    for (const document of documents) {
      transformTasks.push(getTransformedDocument(document, documentFormat))
    }

    const transformedDocuments = await Promise.all(transformTasks)
    const transformedDocumentsWithoutCollisions = (['fileId', 'filename'] as const).reduce(resolveCollisionsByField, transformedDocuments)

    for (const document of transformedDocumentsWithoutCollisions) {
      buildResult.documents.set(document.fileId, document)
    }

    return buildResult
  }
}

// there is a chance that the renamed document will be the same as another document (this case has not been fixed yet)
function resolveCollisionsByField(docs: VersionRestDocument[], field: 'fileId' | 'filename'): VersionRestDocument[] {
  const fileIdMap = groupBy(docs, (document) => document[field])
  return ([...fileIdMap.values()] as VersionRestDocument[][]).reduce((acc, docs) => {
    const [_, ...duplicates] = docs
    duplicates.forEach((document, index) => {document[field] = renameDuplicate(document[field], index)})
    return [...acc, ...docs]
  }, [] as VersionRestDocument[])
}

function renameDuplicate(fileName: string, index: number): string {
  const extension = getFileExtension(fileName)
  const nameWithPostfix = `${getDocumentTitle(fileName)}-${index + 1}`

  if (extension) {
    return `${nameWithPostfix}.${extension}`
  }
  return nameWithPostfix
}

function parseBase64String(value: string): object {
  return JSON.parse(fromBase64(value))
}

function extractDocumentData(versionDocument: VersionDocument): OpenAPIV3.Document {
  try {
    return parseBase64String(versionDocument.data) as OpenAPIV3.Document
  } catch (e) {
    throw new Error(`Cannot parse data of ${versionDocument.slug} from base64-encoded string`)
  }
}

async function transformDocumentData(versionDocument: VersionDocument): Promise<OpenAPIV3.Document> {

  const documentData = extractDocumentData(versionDocument)
  const { paths, components, ...rest } = documentData
  const result: OpenAPIV3.Document = {
    ...rest,
    paths: {},
  }

  for (const path of Object.keys(paths)) {
    const pathData = paths[path]
    if (typeof pathData !== 'object' || !pathData) {
      continue
    }
    const commonPathItemProperties = extractCommonPathItemProperties(pathData)

    for (const method of Object.keys(pathData)) {
      const inferredMethod = method as OpenAPIV3.HttpMethods

      // check if field is a valid openapi http method defined in OpenAPIV3.HttpMethods
      if (!Object.values(OpenAPIV3.HttpMethods).includes(inferredMethod)) {
        continue
      }

      const methodData = pathData[inferredMethod]
      const basePath = getOperationBasePath(methodData?.servers || pathData?.servers || documentData?.servers || [])
      const operationPath = basePath + path

      const operationId = slugify(`${removeFirstSlash(operationPath)}-${method}`)

      if (versionDocument.operationIds.includes(operationId)) {
        const pathData = documentData.paths[path]!
        result.paths[path] = {
          ...result.paths[path],
          ...commonPathItemProperties,
          [inferredMethod]: { ...pathData[inferredMethod] },
        }
        result.components = {
          ...takeIfDefined({ securitySchemes: components?.securitySchemes }),
        }
      }
    }
  }

  return result
}
