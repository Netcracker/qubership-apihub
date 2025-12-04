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
  MergedSpecificationBuildConfig,
} from '../types'
import { ExportTemplate, getSplittedVersionKey, isJson, isYaml, mergeOpenapiDocuments } from '../utils'
import { DocumentGroupStrategy } from './document-group.strategy'
import { OpenAPIV3 } from 'openapi-types'
import { REST_API_TYPE } from '../apitypes'
import { BUILD_TYPE, FILE_FORMAT_JSON } from '../consts'
import { loadYaml } from '@netcracker/qubership-apihub-api-unifier'

export class MergedDocumentGroupStrategy implements BuilderStrategy {
  async execute(config: MergedSpecificationBuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts): Promise<BuildResult> {
    const { packageId, version, groupName, apiType, format = FILE_FORMAT_JSON } = config

    if (!groupName) {
      throw new Error('No group to transform documents for provided')
    }

    if (apiType !== REST_API_TYPE) {
      throw new Error(`API type is not supported: ${apiType}`)
    }

    const { documents: documentsMap } = await new DocumentGroupStrategy().execute(
      {
        ...config,
        buildType: BUILD_TYPE.REDUCED_SOURCE_SPECIFICATIONS,
      },
      buildResult,
      contexts,
    )
    const documents = [...documentsMap.values()]
    const specs = documents.map(doc => doc.data) as OpenAPIV3.Document[]

    const { builderContext } = contexts
    const builderContextObject = builderContext(config)

    const template = await builderContextObject.groupExportTemplateResolver?.(
      apiType,
      version,
      packageId,
      groupName,
    )
    const templateDocument = getTemplateDocument(template)
    const [versionKey] = getSplittedVersionKey(version)

    const info = {
      ...templateDocument?.info,
      title: templateDocument?.info?.title || groupName,
      version: templateDocument?.info?.version || versionKey,
    }

    const [firstDocument] = documents

    buildResult.merged = {
      fileId: info.title,
      type: firstDocument.type,
      format: format,
      data: mergeOpenapiDocuments(specs, info, templateDocument),
      slug: info.title,
      title: info.title,
      description: info.description || '',
      version: version,
      filename: `${info.title}.${format}`,
      dependencies: [],
      operationIds: documents.map(doc => doc.operationIds).flat(),
      metadata: {},
      publish: true,
    }
    return buildResult
  }
}

function getTemplateDocument(rawTemplateDocument?: string): ExportTemplate | undefined {
  if (!rawTemplateDocument) {
    return undefined
  }

  const template = parseTemplateDocument(rawTemplateDocument)

  if (
    typeof template === 'object' &&
    template && 'openapi' in template &&
    typeof template.openapi === 'string' && /3.+/.test(template.openapi)
  ) {
    return template as ExportTemplate
  }
  throw new Error('Template is not valid')
}

function parseTemplateDocument(rawTemplateDocument: string): unknown | undefined {
  if (isJson(rawTemplateDocument)) {
    return JSON.parse(rawTemplateDocument)
  }

  if (isYaml(rawTemplateDocument)) {
    return loadYaml(rawTemplateDocument)
  }

  throw new Error('Template is not a valid JSON or YAML document')
}
