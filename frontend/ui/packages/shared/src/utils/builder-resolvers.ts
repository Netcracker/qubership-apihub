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
  fetchDeprecatedItems,
  fetchExportTemplate,
  fetchOperations,
  fetchVersionDocuments,
  getPackageVersionContent,
  getVersionReferences,
  toVersionOperation,
} from './packages-builder'
import type {
  TemplateResolver,
  VersionDeprecatedResolver,
  VersionDocumentsResolver,
  VersionOperationsResolver,
  VersionReferencesResolver,
  VersionResolver,
} from '@netcracker/qubership-apihub-api-processor'
import { NotFoundError } from './requests'

export async function packageVersionResolver(authorization: string): Promise<VersionResolver> {
  return async (packageId, version, includeOperations = false) => {
    const versionConfig = await getPackageVersionContent(packageId, version, includeOperations, authorization)
    if (!versionConfig) {
      return null
    }
    return {
      packageId: packageId,
      ...versionConfig,
    }
  }
}

export async function versionReferencesResolver(authorization: string): Promise<VersionReferencesResolver> {
  return async (version, packageId) => {
    const references = await getVersionReferences(packageId, version, authorization)

    if (!references) {
      return null
    }

    return references
  }
}

export async function versionOperationsResolver(authorization: string): Promise<VersionOperationsResolver> {
  return async (apiType, version, packageId, operations, includeData) => {
    const fetchedOperations = await fetchOperations(apiType, packageId, version, operations, includeData, authorization)

    if (!fetchedOperations) {
      return { operations: [] }
    }

    return { operations: fetchedOperations.operations.map(toVersionOperation) }
  }
}

export async function versionDeprecatedResolver(authorization: string): Promise<VersionDeprecatedResolver> {
  return async (apiType, version, packageId, operationsIds) => {
    return await fetchDeprecatedItems(apiType, packageId, version, operationsIds, authorization)
  }
}

// TODO: Use for documentGroup buildType transformation. Provide to builder
export async function versionDocumentsResolver(authorization: string): Promise<VersionDocumentsResolver> {
  return async (apiType, version, packageId, filterByOperationGroup) => {
    const EMPTY_DOCUMENTS = { documents: [] }
    const LIMIT = 100
    let page = 0

    const response = await fetchVersionDocuments(
      apiType,
      packageId,
      version,
      filterByOperationGroup,
      authorization,
      page,
      LIMIT,
    )

    if (!response) {
      return EMPTY_DOCUMENTS
    }

    let documentsCount = response.documents.length
    while (documentsCount === LIMIT) {
      page += 1

      const { documents } = await fetchVersionDocuments(
        apiType,
        packageId,
        version,
        filterByOperationGroup,
        authorization,
        page,
        LIMIT,
      ) ?? EMPTY_DOCUMENTS

      response.documents = [...response.documents, ...documents]

      documentsCount = documents.length
    }

    return response
  }
}

export async function templateResolver(authorization: string): Promise<TemplateResolver> {
  return async (apiType, version, packageId, filterByOperationGroup) => {
    try {
      const [content] = await fetchExportTemplate(packageId, version, apiType, filterByOperationGroup, authorization)
      return content
    } catch (error) {
      if (error instanceof NotFoundError) {
        return ''
      }
      throw error
    }
  }
}
