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

import axios, { AxiosInstance } from 'axios'
import * as https from 'https'

import {
  type BuildConfig,
  BuilderContext,
  BuilderResolvers,
  BuildResult,
  graphqlApiBuilder, MESSAGE_SEVERITY,
  OperationId,
  OperationsApiType,
  PackageId,
  PackageVersionBuilder,
  ResolvedComparisonSummary,
  ResolvedDeprecatedOperations,
  ResolvedGroupDocuments,
  ResolvedOperations,
  ResolvedReferences,
  ResolvedVersion,
  restApiBuilder,
  textApiBuilder,
  unknownApiBuilder,
  VersionId,
} from '../../../src'
import { IRegistry } from './types'
import AdmZip from 'adm-zip'
import fs from 'fs/promises'
import {
  saveComparisonsArray,
  saveDocumentsArray,
  saveEachComparison,
  saveEachDocument,
  saveEachOperation,
  saveInfo,
  saveNotifications,
  saveOperationsArray,
} from './utils'
import { toVersionsComparisonDto } from '../../../src/utils/transformToDto'

export const VERSIONS_PATH = 'test/versions'

export interface ApihubRegistryParams {
  url?: string
  token?: string
  packageId?: string
  versionId?: string
}

export class ApihubRegistry implements IRegistry {
  params: ApihubRegistryParams = {}

  apiBuilders = [restApiBuilder, graphqlApiBuilder, textApiBuilder, unknownApiBuilder]

  sources?: AdmZip

  config?: BuildConfig

  fileKeys?: string[]

  async publish(packageId: string, version: string, publishParams?: Partial<BuildConfig>): Promise<void> {

    await this.getSources(packageId, version)

    const builder = new PackageVersionBuilder(this.config!, {
      resolvers: {
        ...this.versionResolvers,
      },
      configuration: { bundleComponents: true },
    })
    const buildResult = await builder.run()

    await this.publishPackage(buildResult, builder.builderContext(this.config!), this.config!)
  }

  //copy-paste from local registry
  async publishPackage(
    buildResult: BuildResult,
    builderContext: BuilderContext,
    config: BuildConfig,
  ): Promise<void> {
    const {
      operations,
      documents,
      comparisons,
      notifications,
    } = buildResult

    const basePath = `${VERSIONS_PATH}/${config.packageId}/${config.version}`
    try {
      await fs.rm(basePath, { recursive: true })
    } catch (e) {
      // do nothing
    }

    const logError = (message: string): void => {
      notifications.push({
        severity: MESSAGE_SEVERITY.Error,
        message: message,
      })
    }

    await fs.mkdir(basePath, { recursive: true })

    await saveInfo(config, basePath)

    await saveDocumentsArray(documents, basePath)
    await saveEachDocument(documents, basePath, builderContext)

    await saveOperationsArray(operations, basePath)
    await saveEachOperation(operations, basePath)
    const comparisonsDto = comparisons.map(comparison => toVersionsComparisonDto(comparison, logError))
    await saveComparisonsArray(comparisonsDto, basePath)
    await saveEachComparison(comparisonsDto, basePath)
    await saveNotifications(notifications, basePath)
  }

  get versionResolvers(): BuilderResolvers {
    return {
      fileResolver: this.fileResolver.bind(this),
      versionResolver: this.versionResolver.bind(this),
      versionOperationsResolver: this.versionOperationsResolver.bind(this),
      versionReferencesResolver: this.versionReferencesResolver.bind(this),
      versionComparisonResolver: this.versionComparisonResolver.bind(this),
      versionDeprecatedResolver: this.versionDeprecatedResolver.bind(this),
      // todo versionDocumentsResolver: this.versionDocumentsResolver.bind(this),
      groupDocumentsResolver: this.groupDocumentsResolver.bind(this),
    }
  }

  async fileResolver(
    fileId: string,
  ): Promise<Blob | null> {
    const fullPath = `sources/${fileId}`
    const filePath = this.fileKeys?.find((key) => key.includes(fileId))
    if (!this.sources || !this.fileKeys || !filePath) {
      return null
    }

    const buffer = this.sources.readFile(fullPath)
    return buffer ? new Blob([buffer]) : null
  }

  async versionResolver(
    packageId = '',
    versionId: string,
    includeOperations?: boolean,
  ): Promise<ResolvedVersion | null> {
    const encodedPackageKey = encodeURIComponent(packageId)
    const encodedVersionKey = encodeURIComponent(versionId)

    const { data } = await this.axios.get(`/api/v2/packages/${encodedPackageKey}/versions/${encodedVersionKey}?includeOperations=${includeOperations}`)
    return data
  }

  async versionOperationsResolver(
    apiType: OperationsApiType,
    version: string,
    packageId: string,
    operationsIds: OperationId[] = [],
    includeData: boolean = false,
    limit = 100,
  ): Promise<ResolvedOperations | null> {
    const queryParams = new URLSearchParams()
    queryParams.append('includeData', `${includeData}`)
    queryParams.append('limit', `${limit}`)
    operationsIds && operationsIds.length && queryParams.append('ids', `${operationsIds.join(',')}`)

    const encodedPackageKey = encodeURIComponent(packageId)
    const encodedVersionKey = encodeURIComponent(version)
    const { data } = await this.axios.get(`/api/v2/packages/${encodedPackageKey}/versions/${encodedVersionKey}/${apiType}/operations?${queryParams}`)
    return data
  }

  async versionReferencesResolver(
    versionId: string,
    packageId: string,
  ): Promise<ResolvedReferences> {
    const encodedPackageKey = encodeURIComponent(packageId)
    const encodedVersionKey = encodeURIComponent(versionId)

    const { data } = await this.axios.get(`/api/v3/packages/${encodedPackageKey}/versions/${encodedVersionKey}/references`)
    return data ?? null
  }

  async versionComparisonResolver(
    version: string,
    packageId: string,
    previousVersion: string,
    previousVersionPackageId?: string,
  ): Promise<ResolvedComparisonSummary | null> {
    const queryParams = new URLSearchParams()
    queryParams.append('previousVersion', `${previousVersion}`)
    queryParams.append('previousVersionPackageId', `${previousVersionPackageId}`)

    const encodedPackageKey = encodeURIComponent(packageId)
    const encodedVersionKey = encodeURIComponent(version)

    const { data } = await this.axios.get(`/api/v2/packages/${encodedPackageKey}/versions/${encodedVersionKey}/changes/summary?${queryParams}`)
    return data ?? null
  }

  async versionDeprecatedResolver(
    apiType: OperationsApiType,
    version: VersionId,
    packageId: PackageId,
    operationsIds?: OperationId[],
  ): Promise<ResolvedDeprecatedOperations | null> {
    const queryParams = new URLSearchParams()
    queryParams.append('includeDeprecatedItems', `${true}`)
    operationsIds && operationsIds.length && queryParams.append('ids', `${operationsIds.join(',')}`)

    const encodedPackageKey = encodeURIComponent(packageId)
    const encodedVersionKey = encodeURIComponent(version)

    const { data } = await this.axios.get(`/api/v2/packages/${encodedPackageKey}/versions/${encodedVersionKey}/${apiType}/deprecated?${queryParams}`)
    return data ?? null
  }

  async groupDocumentsResolver(
    apiType: OperationsApiType,
    version: VersionId,
    packageId: PackageId,
    filterByOperationGroup: string,
  ): Promise<ResolvedGroupDocuments | null> {
    const encodedPackageKey = encodeURIComponent(packageId)
    const encodedVersionKey = encodeURIComponent(version)
    const response: ResolvedGroupDocuments = { documents: [], packages: {} }

    const LIMIT = 100
    let page = 0

    let documentsCount = LIMIT
    do {
      const queryParams = new URLSearchParams()
      queryParams.append('limit', `${LIMIT}`)
      queryParams.append('page', `${page}`)
      const { data: documents } = await this.axios.get(`}/api/v2/packages/${encodedPackageKey}/versions/${encodedVersionKey}/${apiType}/groups/${filterByOperationGroup}/transformation/documents?${queryParams}`)

      response.documents = [...response.documents, ...documents]

      page += 1
      documentsCount = documents.length
    } while (documentsCount === LIMIT)

    return response
  }

  constructor(params?: ApihubRegistryParams) {
    this.params = { ...params }
  }

  async getSources(packageId: string, version: string): Promise<void> {
    const encodedPackageKey = encodeURIComponent(packageId)
    const encodedVersionKey = encodeURIComponent(version)
    const {
      data: { sources, config },
    } = await this.axios.get(`/api/v2/packages/${encodedPackageKey}/versions/${encodedVersionKey}/sourceData`)
    this.sources = new AdmZip(Buffer.from(sources, 'base64'))
    this.config = config
    this.fileKeys = this.sources?.getEntries().map(({ entryName }) => entryName)
  }

  get axios(): AxiosInstance {
    return axios.create({
      baseURL: this.params.url,
      headers: { Authorization: `Bearer ${this.params.token}` },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      responseEncoding: 'binary',
    })
  }

  async auth(username: string, password: string): Promise<void> {
    const { data } = await this.axios.post('/api/v2/auth/local', {}, {
      auth: {
        username: username,
        password: password,
      },
    })

    this.params.token = data.token
  }
}
