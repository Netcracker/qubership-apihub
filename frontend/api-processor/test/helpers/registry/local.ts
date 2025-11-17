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

import * as fs from 'fs/promises'
import { loadConfig, loadFile, loadFileAsString } from '../utils'
import {
  ApiOperation,
  BuildConfig,
  BuilderContext,
  BuilderResolvers,
  BuildResult,
  ChangeSummary, ComparisonInternalDocument,
  EMPTY_CHANGE_SUMMARY,
  FILE_FORMAT,
  graphqlApiBuilder,
  isGraphqlDocument,
  isRestDocument,
  KIND_PACKAGE,
  MESSAGE_SEVERITY,
  NotificationMessage,
  OperationId,
  OperationsApiType,
  PACKAGE,
  PackageId,
  PackageNotifications,
  PackageVersionBuilder,
  ReferenceElement,
  ResolvedComparisons,
  ResolvedComparisonSummary,
  ResolvedDeprecatedOperation,
  ResolvedDeprecatedOperations,
  ResolvedGroupDocument,
  ResolvedGroupDocuments,
  ResolvedOperation,
  ResolvedOperations,
  ResolvedReferenceMap,
  ResolvedReferences,
  ResolvedVersion,
  ResolvedVersionDocument,
  ResolvedVersionDocuments,
  restApiBuilder,
  REVISION_DELIMITER,
  textApiBuilder,
  unknownApiBuilder,
  VERSION_STATUS,
  VersionDocument,
  VersionDocuments,
  VersionId,
  VersionsComparison, VersionsComparisonDto,
  ZippableDocument,
} from '../../../src'
import {
  getOperationsFileContent, saveComparisonInternalDocuments, saveComparisonInternalDocumentsArray,
  saveComparisonsArray,
  saveDocumentsArray,
  saveEachComparison,
  saveEachDocument,
  saveEachOperation,
  saveInfo,
  saveNotifications,
  saveOperationsArray, saveVersionInternalDocuments, saveVersionInternalDocumentsArray,
} from './utils'
import {
  getCompositeKey,
  getDocumentTitle,
  getSplittedVersionKey,
  isNotEmpty,
  takeIfDefined,
  toBase64,
} from '../../../src/utils'
import { IRegistry } from './types'
import { calculateTotalChangeSummary } from '../../../src/components/compare'
import { toVersionsComparisonDto } from '../../../src/utils/transformToDto'
import path from 'path'
import { ResolvedPackage } from '../../../src/types/external/package'
import { version as apiProcessorVersion } from '../../../package.json'

const VERSIONS_PATH = 'test/versions'
export const DEFAULT_PROJECTS_PATH = 'test/projects'

export interface PackageVersionCache {
  config: BuildConfig
  documents: Map<string, VersionDocument>
  operations: Map<string, ApiOperation>
  comparisons: VersionsComparison[]
  notifications: NotificationMessage[]
}

export class LocalRegistry implements IRegistry {
  versions = new Map<string, PackageVersionCache>()
  apiBuilders = [restApiBuilder, graphqlApiBuilder, textApiBuilder, unknownApiBuilder]

  get versionResolvers(): Omit<BuilderResolvers, 'fileResolver'> {
    return {
      packageResolver: this.packageResolver.bind(this),
      versionResolver: this.versionResolver.bind(this),
      versionOperationsResolver: this.versionOperationsResolver.bind(this),
      versionReferencesResolver: this.versionReferencesResolver.bind(this),
      versionComparisonResolver: this.versionComparisonResolver.bind(this),
      versionDeprecatedResolver: this.versionDeprecatedResolver.bind(this),
      groupDocumentsResolver: this.groupDocumentsResolver.bind(this),
      versionDocumentsResolver: this.versionDocumentsResolver.bind(this),
      rawDocumentResolver: this.rawDocumentResolver.bind(this),
    }
  }

  groupToOperationIdsMap: Record<string, string[]> = {}
  projectsDir: string = DEFAULT_PROJECTS_PATH

  constructor(public packageId: string, groupOperationIds: Record<string, string[]> = {}, projectsDir: string = DEFAULT_PROJECTS_PATH) {
    this.groupToOperationIdsMap = groupOperationIds
    this.projectsDir = projectsDir
  }

  static openPackage(packageId: string, groupOperationIds: Record<string, string[]> = {}, projectsDir: string = DEFAULT_PROJECTS_PATH): LocalRegistry {
    return new LocalRegistry(packageId, groupOperationIds, projectsDir)
  }

  async packageResolver(
    packageId: string,
  ): Promise<ResolvedPackage | null> {
    const config = await loadConfig(this.projectsDir, packageId)

    if (!config || !config.packageName) {
      return null
    }

    return {
      packageId: config.packageId,
      name: config.packageName,
    }
  }

  async versionResolver(
    packageId = '',
    version: string,
  ): Promise<ResolvedVersion | null> {
    const {
      config,
      comparisons = [],
      operations = [],
    } = await this.getVersion(packageId, getSplittedVersionKey(version)[0]) || {}

    if (!config) {
      return null
    }

    const apiTypes = Array.from(operations.values()).map(({ apiType }) => apiType)

    const getChangesSummary = (apiType: OperationsApiType): ChangeSummary => {
      return calculateTotalChangeSummary(
        comparisons.map(
          comparison => comparison.operationTypes.find(type => type.apiType === apiType)?.changesSummary ?? EMPTY_CHANGE_SUMMARY,
        ),
      )
    }

    return {
      ...config,
      apiTypes: apiTypes,
      createdAt: 'unknown',
      createdBy: 'builder',
      versionLabels: [],
      revision: 0,
      operationTypes: apiTypes.map(apiType => ({ apiType: apiType, changesSummary: getChangesSummary(apiType) })),
      apiProcessorVersion: apiProcessorVersion,
    }
  }

  async versionOperationsResolver(
    apiType: OperationsApiType,
    version: string,
    packageId?: string,
    operationsIds?: OperationId[],
    includeData?: boolean,
  ): Promise<ResolvedOperations | null> {
    const { operations } = await this.getVersion(packageId || this.packageId, version) ?? {}

    const versionOperations: ResolvedOperation[] = (operationsIds ?? [...operations?.keys() ?? []])
      .flatMap(id => {
        const operation = operations?.get(id)
        return operation?.apiType === apiType
          ? [{
            ...operation,
            data: includeData ? operation.data : undefined,
          }]
          : []
      })

    return { operations: versionOperations }
  }

  async groupDocumentsResolver(
    apiType: OperationsApiType,
    version: string,
    packageId: string,
    filterByOperationGroup: string,
  ): Promise<ResolvedGroupDocuments | null> {
    const { config: { refs = [] } = {}, documents } = await this.getVersion(packageId || this.packageId, version) ?? {}

    const documentsFromVersion = Array.from(documents?.values() ?? [])

    if (isNotEmpty(documentsFromVersion)) {
      return {
        documents: this.resolveDocuments(documentsFromVersion, this.filterOperationIdsByGroup(filterByOperationGroup)),
        packages: {},
      }
    }

    const documentsFromRefs = (
      await Promise.all(refs.map(async ({ refId, version }) => {
        const versionCache = await this.getVersion(refId, version)
        if (!versionCache) return []
        const { documents } = versionCache
        return this.resolveDocuments(Array.from(documents.values()), this.filterOperationIdsByGroup(filterByOperationGroup), refId)
      }))
    ).flat()

    const packages = refs.reduce((acc, ref) => {
      acc[ref.refId] = {
        refId: ref.refId,
        version: ref.version,
        kind: KIND_PACKAGE,
        name: ref.refId,
        status: VERSION_STATUS.DRAFT,
      }
      return acc
    }, {} as ResolvedReferenceMap)

    return { documents: documentsFromRefs, packages: packages }
  }

  async versionDocumentsResolver(
    version: VersionId,
    packageId: PackageId,
    apiType?: OperationsApiType,
  ): Promise<ResolvedVersionDocuments | null> {
    const { config: { refs = [] } = {}, documents } = await this.getVersion(packageId || this.packageId, version) ?? {}

    const documentsFromVersion = Array.from(documents?.values() ?? [])

    if (isNotEmpty(documentsFromVersion)) {
      return {
        documents: this.resolveDocuments(documentsFromVersion, undefined, undefined, apiType),
        packages: {},
      }
    }

    const documentsFromRefs = (
      await Promise.all(refs.map(async ({ refId, version }) => {
        const versionCache = await this.getVersion(refId, version)
        if (!versionCache) return []
        const { documents } = versionCache
        return this.resolveDocuments(Array.from(documents.values()), undefined, refId)
      }))
    ).flat()

    const packages = refs.reduce((acc, ref) => {
      acc[ref.refId] = {
        refId: ref.refId,
        version: ref.version,
        kind: KIND_PACKAGE,
        name: ref.refId,
        status: VERSION_STATUS.DRAFT,
      }
      return acc
    }, {} as ResolvedReferenceMap)

    return { documents: documentsFromRefs, packages: packages }
  }

  private async findFileNameBySlug(directory: string, slug: string): Promise<string> {
    const files = await fs.readdir(directory)
    const fileName = files.find(file => getDocumentTitle(file).toLowerCase() === slug.toLowerCase())
    if (!fileName) {
      throw new Error(`File for slug ${slug} was not found in ${directory}`)
    }
    return fileName
  }

  async rawDocumentResolver(
    version: VersionId,
    packageId: PackageId,
    slug: string,
  ): Promise<File | null> {
    const documentsPath = `${packageId}/${version}/documents`
    const fileName = await this.findFileNameBySlug(path.join(process.cwd(), VERSIONS_PATH, documentsPath), slug)
    return loadFile(VERSIONS_PATH, documentsPath, fileName)
  }

  private filterOperationIdsByGroup(filterByOperationGroup: string): (id: string) => boolean {
    return (id: string): boolean => this.groupToOperationIdsMap[filterByOperationGroup]?.includes(id)
  }

  private resolveDocuments(documents: VersionDocument[], filterOperationIdsByGroup?: (id: string) => boolean, refId?: string, apiType?: OperationsApiType): ResolvedGroupDocument[] {
    return documents
      .filter(versionDocument => (apiType ? this.getDocApiTypeGuard(apiType)(versionDocument) : true))
      .filter(versionDocument => (filterOperationIdsByGroup ? versionDocument.operationIds.some(filterOperationIdsByGroup) : true))
      .map(document => ({
        version: document.version,
        fileId: document.fileId,
        slug: document.slug,
        type: document.type,
        format: document.format,
        filename: document.filename,
        labels: [],
        title: document.title,
        includedOperationIds: filterOperationIdsByGroup ? document.operationIds.filter(filterOperationIdsByGroup!) : document.operationIds,
        description: document.description,
        data: toBase64(JSON.stringify(document.data)),
        ...takeIfDefined({ packageRef: refId }),
      }))
  }

  private getDocApiTypeGuard(apiType: OperationsApiType): (document: ZippableDocument | ResolvedVersionDocument) => void {
    switch (apiType) {
      case 'rest':
        return isRestDocument
      case 'graphql':
        return isGraphqlDocument
    }
  }

  async versionDeprecatedResolver(
    apiType: OperationsApiType,
    version: string,
    packageId?: string,
    operationsIds?: OperationId[],
  ): Promise<ResolvedDeprecatedOperations | null> {
    const { operations } = await this.getVersion(packageId || this.packageId, version) ?? {}

    const versionOperations: ResolvedDeprecatedOperation[] = (operationsIds ?? [...operations?.keys() ?? []])
      ?.filter(id => operations?.has(id) && operations.get(id)?.deprecatedItems?.length)
      .map((id) => {
        const {
          deprecatedItems,
          deprecated,
          operationId,
          apiType,
          apiKind,
          deprecatedInfo,
          deprecatedInPreviousVersions,
        } = operations!.get(id)!

        return ({
          operationId,
          apiType,
          apiKind,
          deprecated,
          deprecatedItems,
          deprecatedInfo,
          deprecatedInPreviousVersions,
        })
      })

    if (!versionOperations.length) {
      return null
    }

    return { operations: versionOperations }
  }

  async versionReferencesResolver(
    version: string,
    packageId?: string,
  ): Promise<ResolvedReferences> {
    const references: ReferenceElement[] = []
    const stack = [{ version, packageId }]
    const packages: ResolvedReferenceMap = {}

    while (stack.length) {
      const { version, packageId } = stack.pop() ?? {}
      if (!version || !packageId) {
        continue
      }
      const { config } = await this.getVersion(packageId, version) ?? {}

      if (config?.refs?.length) {
        for (const ref of config.refs) {
          const packageRef = `${ref.refId}${REVISION_DELIMITER}${ref.version}`
          packages[packageRef] = {
            refId: ref.refId,
            version: ref.version,
            kind: KIND_PACKAGE,
            name: ref.refId,
            status: VERSION_STATUS.DRAFT,
          }
          references.push({
            packageRef: packageRef,
          })
        }
        for (const ref of config.refs) {
          stack.push({ packageId: ref.refId, version: ref.version })
        }
      }
    }

    return { references, packages }
  }

  // TODO
  async versionComparisonResolver(
    version: string,
    packageId: string,
    previousVersion: string,
    previousVersionPackageId?: string,
  ): Promise<ResolvedComparisonSummary | null> {
    return null
  }

  async publish(projectId: string, publishParams?: Partial<BuildConfig>): Promise<BuildResult> {
    const loadedConfig = await loadConfig(this.projectsDir, projectId) as BuildConfig
    const versionConfig = {
      ...loadedConfig,
      status: VERSION_STATUS.RELEASE,
      ...publishParams,
    }
    const builder = new PackageVersionBuilder(versionConfig, {
      resolvers: {
        fileResolver: (fileId) => loadFile(this.projectsDir, projectId, fileId),
        ...this.versionResolvers,
      },
    })

    const buildResult = await builder.run()

    await this.publishPackage(buildResult, builder.builderContext(versionConfig), versionConfig)

    return buildResult
  }

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
    await fs.mkdir(basePath, { recursive: true })

    await saveInfo(config, basePath)

    await saveDocumentsArray(documents, basePath)
    await saveVersionInternalDocumentsArray(documents, basePath)
    await saveEachDocument(documents, basePath, builderContext)

    await saveOperationsArray(operations, basePath)
    await saveEachOperation(operations, basePath)

    const logError = (message: string): void => {
      notifications.push({
        severity: MESSAGE_SEVERITY.Error,
        message: message,
      })
    }
    const comparisonsDto: VersionsComparisonDto[] = comparisons.map(comparison => toVersionsComparisonDto(comparison, logError))
    const comparisonInternalDocuments: ComparisonInternalDocument[] = comparisons.map(comparison => comparison.comparisonInternalDocuments).flat()

    await saveComparisonsArray(comparisonsDto, basePath)
    await saveEachComparison(comparisonsDto, basePath)
    await saveNotifications(notifications, basePath)
    await saveVersionInternalDocuments(documents, basePath)

    await saveComparisonInternalDocumentsArray(comparisonInternalDocuments, basePath)
    await saveComparisonInternalDocuments(comparisonInternalDocuments, basePath)
  }

  async updateOperationsHash(packageId: string, publishParams?: Partial<BuildConfig>): Promise<void> {
    const loadedConfig = await loadConfig(this.projectsDir, packageId) as BuildConfig
    const versionConfig = { ...loadedConfig, ...publishParams }
    const builder = new PackageVersionBuilder(versionConfig, {
      resolvers: {
        fileResolver: (fileId) => loadFile(this.projectsDir, loadedConfig.packageId, fileId),
        ...this.versionResolvers,
      },
    })

    const { operations } = await builder.run()

    const basePath = `${VERSIONS_PATH}/${loadedConfig.packageId}/${versionConfig.version}`

    await fs.writeFile(
      `${basePath}/${PACKAGE.OPERATIONS_FILE_NAME}`,
      getOperationsFileContent(operations, true),
    )
  }

  async getVersion(packageId: string, versionKey: string): Promise<PackageVersionCache | undefined> {
    const compositeKey = getCompositeKey(packageId, versionKey)
    if (this.versions.has(compositeKey)) {
      return this.versions.get(compositeKey)
    }

    const versionConfig = await loadConfig(
      VERSIONS_PATH,
      `${packageId}/${versionKey}`,
      PACKAGE.INFO_FILE_NAME,
    ) as BuildConfig
    const versionCache: PackageVersionCache = {
      config: versionConfig,
      documents: new Map(),
      operations: new Map(),
      comparisons: [],
      notifications: [],
    }

    if (!versionConfig) {
      return
    }

    const operationsFile = await loadFileAsString(
      VERSIONS_PATH,
      `${packageId}/${versionKey}`,
      PACKAGE.OPERATIONS_FILE_NAME,
    )

    const { operations } = operationsFile ? JSON.parse(operationsFile) : null as ResolvedOperations | null ?? { operations: [] }

    for (const operation of operations) {
      if (!operation) {
        continue
      }

      const data = await loadFileAsString(
        VERSIONS_PATH,
        `${packageId}/${versionKey}/${PACKAGE.OPERATIONS_DIR_NAME}`,
        `${operation.operationId}.json`,
      )
      versionCache.operations.set(
        operation.operationId,
        {
          ...operation,
          data: data ? JSON.parse(data) : undefined,
        },
      )
    }

    const documentsFile = await loadFileAsString(
      VERSIONS_PATH,
      `${packageId}/${versionKey}`,
      PACKAGE.DOCUMENTS_FILE_NAME,
    )
    const { documents } = documentsFile ? JSON.parse(documentsFile) : null as VersionDocuments | null ?? { documents: [] }
    for (const document of documents) {
      const data = await loadFileAsString(
        VERSIONS_PATH,
        `${packageId}/${versionKey}/${PACKAGE.DOCUMENTS_DIR_NAME}`,
        document.filename,
      )

      if (data) {
        const source = data
        const isJson = document.format === FILE_FORMAT.JSON
        versionCache.documents.set(document.slug, {
          ...document,
          data: isJson ? JSON.parse(data) : '',
          ...(!isJson && { source }),
        })
      }
    }

    const comparisonsFile = await loadFileAsString(
      VERSIONS_PATH,
      `${packageId}/${versionKey}`,
      PACKAGE.COMPARISONS_FILE_NAME,
    )
    const { comparisons } = (comparisonsFile
      ? JSON.parse(comparisonsFile)
      : null) as ResolvedComparisons ?? { comparisons: [] }

    if (comparisons && Array.isArray(comparisons) && isNotEmpty(comparisons)) {
      versionCache.comparisons.push(...comparisons as VersionsComparison[])
    }

    const notificationsFile = await loadFileAsString(
      VERSIONS_PATH,
      `${packageId}/${versionKey}`,
      PACKAGE.NOTIFICATIONS_FILE_NAME,
    )
    const { notifications } = (notificationsFile
      ? JSON.parse(notificationsFile)
      : null) as PackageNotifications ?? { notifications: [] }
    notifications && isNotEmpty(notifications) && versionCache.notifications.push(...notifications)

    this.versions.set(compositeKey, versionCache)
    return versionCache
  }

  async updateVersionFile(version: string, slug: string, modifier: (data: any) => any): Promise<void> {
    const versionCache = await this.getVersion(this.packageId, version)

    const document = versionCache?.documents.get(slug)
    if (!document) {
      return
    }

    versionCache?.documents.set(slug, { ...document, data: modifier(document.data) })
  }

  async updateVersionOperation(version: string, operationId: string, modifier: (data: ApiOperation) => ApiOperation): Promise<void> {
    const versionCache = await this.getVersion(this.packageId, version)

    const operation = versionCache?.operations.get(operationId)
    if (!operation) {
      return
    }

    versionCache?.operations.set(operationId, modifier(operation))
  }
}
