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

import { createGraphQLExportDocument } from '../apitypes/graphql/graphql.document'
import { BuildResult, BuildTypeContexts, ExportGraphQLOperationsGroupBuildConfig } from '../types'
import { ExportOperationsGroupStrategy } from './export-operations-group.strategy'
import { GRAPHQL_API_TYPE } from '../consts'

export class ExportGraphQlOperationsGroupStrategy extends ExportOperationsGroupStrategy<ExportGraphQLOperationsGroupBuildConfig> {
  protected readonly supportedApiType = GRAPHQL_API_TYPE

  async exportReducedDocuments(
    config: ExportGraphQLOperationsGroupBuildConfig,
    buildResult: BuildResult,
    contexts: BuildTypeContexts,
  ): Promise<void> {
    await this.resolveReducedDocuments(config, buildResult, contexts)

    const transformedDocuments = await Promise.all([...buildResult.documents.values()].map(async document => {
      return createGraphQLExportDocument(
        document.filename,
        document.data as string,
        config.format,
      )
    }))

    buildResult.exportDocuments.push(...transformedDocuments)
  }

  protected exportMergedDocument(): Promise<void> {
    throw new Error('This transformation kind is not supported for graphql apiType')
  }
}
