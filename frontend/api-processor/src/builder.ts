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

import type {
  BuildConfig,
  BuildConfigFile,
  BuildConfigRef,
  FileId,
  OperationId,
  OperationsApiType,
  OperationTypes,
  PackageId,
  ResolvedComparisonSummary,
  ResolvedDeprecatedOperations,
  ResolvedDocuments,
  ResolvedOperations,
  ResolvedVersionOperationsHashMap,
  VersionId,
} from './types'
import {
  ApiBuilder,
  ApiOperation,
  BuilderContext,
  BuilderParams,
  BuilderRunOptions,
  BuildResult,
  CompareContext,
  File,
  FILE_KIND,
  FileSourceMap,
  IPackageVersionBuilder,
  OperationChanges,
  VersionCache,
  VersionDocument,
  VersionsComparisonDto,
} from './types/internal'
import type { NotificationMessage, PackageConfig } from './types/package'
import { graphqlApiBuilder, REST_API_TYPE, restApiBuilder, textApiBuilder, unknownApiBuilder } from './apitypes'
import { filesDiff, findSharedPath, getCompositeKey, getFileExtension, getOperationsList } from './utils'
import { BUILD_TYPE, DEFAULT_BATCH_SIZE, MESSAGE_SEVERITY, SUPPORTED_FILE_FORMATS, VERSION_STATUS } from './consts'
import { unknownParsedFile } from './apitypes/unknown/unknown.parser'
import { createVersionPackage } from './components/package'
import { compareVersions } from './components/compare'
import { buildFiles } from './components/files'
import JSZip from 'jszip'
import { calculateHistoryForDeprecatedItems } from './components/deprecated'
import { JsZipTool } from './components/js-zip-tool'
import { AdmZipTool } from './components/adm-zip-tool'
import { validateConfig } from './validators'
import { BuildStrategy, ChangelogStrategy, DocumentGroupStrategy, PrefixGroupsChangelogStrategy } from './strategies'
import { BuilderStrategyContext } from './builder-strategy'
import { MergedDocumentGroupStrategy } from './strategies/merged-document-group.strategy'
import { asyncDebugPerformance } from './utils/logs'

export const DEFAULT_RUN_OPTIONS: BuilderRunOptions = {
  cleanCache: false,
}

export class PackageVersionBuilder implements IPackageVersionBuilder {
  apiBuilders: ApiBuilder[] = []
  documents = new Map<string, VersionDocument>()
  operations = new Map<string, ApiOperation>()
  comparisons: VersionsComparisonDto[] = []

  versionsCache = new Map<string, VersionCache>()
  referencesCache = new Map<string, BuildConfigRef[]>()
  packageChangesCache = new Map<string, OperationChanges[]>()

  notifications: NotificationMessage[] = []
  merged?: VersionDocument
  config: BuildConfig
  builderRunOptions = DEFAULT_RUN_OPTIONS

  readonly parsedFiles: Map<string, File> = new Map()

  private basePath: string = ''

  constructor(config: BuildConfig, public params: BuilderParams, fileSources?: FileSourceMap) {
    this.apiBuilders.push(restApiBuilder, graphqlApiBuilder, textApiBuilder, unknownApiBuilder)
    this.config = { previousVersion: '', previousVersionPackageId: '', ...config }

    this.params.configuration = {
      batchSize: DEFAULT_BATCH_SIZE,

      ...this.params.configuration,
    }

    // parse fileSources
    if (fileSources && typeof fileSources === 'object') {
      for (const [fileId, source] of Object.entries(fileSources)) {
        this.parseFile(fileId, source)
      }
    }
  }

  async createVersionPackage(options?: JSZip.JSZipGeneratorOptions): Promise<any> {
    return createVersionPackage(this.buildResult, new JsZipTool(), this.builderContext(this.config), options)
  }

  async createNodeVersionPackage(): Promise<Buffer> {
    return createVersionPackage(this.buildResult, new AdmZipTool(), this.builderContext(this.config))
  }

  get operationList(): ApiOperation[] {
    return getOperationsList(this.buildResult)
  }

  get packageConfig(): PackageConfig {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { files, ...config } = this.config
    return config
  }

  get buildResult(): BuildResult {
    return {
      operations: this.operations,
      comparisons: this.comparisons,
      documents: this.documents,
      config: this.packageConfig,
      notifications: this.notifications,
      merged: this.merged,
    }
  }

  private setBuildResult(buildResult: BuildResult): void {
    this.operations = buildResult.operations
    this.comparisons = buildResult.comparisons
    this.documents = buildResult.documents
    this.notifications = buildResult.notifications
    this.merged = buildResult.merged
  }

  builderContext(config: BuildConfig): BuilderContext {
    return {
      apiBuilders: this.apiBuilders,
      basePath: findSharedPath(config.files?.map(({ fileId }) => fileId).filter(Boolean) ?? []),
      versionDeprecatedResolver: this.versionDeprecatedResolver.bind(this),
      parsedFileResolver: this.parsedFileResolver.bind(this),
      operationResolver: (operationId: OperationId) => this.operations.get(operationId) ?? null,
      notifications: this.notifications,
      config: this.config,
      configuration: this.params.configuration,
      builderRunOptions: this.builderRunOptions,
      versionDocumentsResolver: this.versionDocumentsResolver.bind(this),
      templateResolver: this.params.resolvers.templateResolver,
      versionLabels: this.config.metadata?.versionLabels as Array<string>,
    }
  }

  private compareContext(config: BuildConfig): CompareContext {
    return {
      apiBuilders: this.apiBuilders,
      notifications: this.notifications,
      batchSize: this.params.configuration?.batchSize,
      config: config,
      versionResolver: this.versionResolver.bind(this),
      versionOperationsResolver: this.versionOperationsResolver.bind(this),
      versionReferencesResolver: this.versionReferencesResolver.bind(this),
      versionComparisonResolver: this.versionComparisonResolver.bind(this),
      versionDeprecatedResolver: this.versionDeprecatedResolver.bind(this),
    }
  }

  async run(options: BuilderRunOptions = DEFAULT_RUN_OPTIONS): Promise<BuildResult> {
    this.builderRunOptions = options
    validateConfig(this.config)
    this.clearCaches()

    const {
      buildType = BUILD_TYPE.BUILD,
    } = this.config

    const defaultStrategy = new BuildStrategy()
    const builderStrategyContext = new BuilderStrategyContext(
      defaultStrategy,
      this.config,
      this.buildResult,
      {
        builderContext: this.builderContext.bind(this),
        compareContext: this.compareContext.bind(this),
      },
    )

    if (buildType === BUILD_TYPE.PREFIX_GROUPS_CHANGELOG) {
      builderStrategyContext.setStrategy(new PrefixGroupsChangelogStrategy())
    }

    if (buildType === BUILD_TYPE.CHANGELOG) {
      builderStrategyContext.setStrategy(new ChangelogStrategy())
    }

    if (buildType === BUILD_TYPE.DOCUMENT_GROUP) {
      builderStrategyContext.setStrategy(new DocumentGroupStrategy())
    }

    if (buildType === BUILD_TYPE.REDUCED_SOURCE_SPECIFICATIONS) {
      builderStrategyContext.setStrategy(new DocumentGroupStrategy())
    }

    if (buildType === BUILD_TYPE.MERGED_SPECIFICATION) {
      builderStrategyContext.setStrategy(new MergedDocumentGroupStrategy())
    }

    await asyncDebugPerformance('[Builder]', async (debugCtx) => {
      this.setBuildResult(await builderStrategyContext.executeStrategy(debugCtx))
    }, undefined, [buildType, this.config.packageId, this.config.version])

    return this.buildResult
  }

  async parsedFileResolver(fileId: string): Promise<File | null> {
    if (this.parsedFiles.has(fileId)) {
      return this.parsedFiles.get(fileId) ?? null
    }

    if (!this.params.resolvers.fileResolver) {
      return null
    }

    const source = await this.params.resolvers.fileResolver(fileId)
    if (!source) {
      this.notifications.push({
        severity: MESSAGE_SEVERITY.Error,
        message: 'Cannot resolve file',
        fileId: fileId,
      })
      return null
    }

    return await this.parseFile(fileId, source)
  }

  async versionComparisonResolver(
    version: VersionId,
    packageId: PackageId,
    previousVersion: VersionId,
    previousVersionPackageId: PackageId,
  ): Promise<ResolvedComparisonSummary | null> {
    const { versionComparisonResolver } = this.params.resolvers
    if (!versionComparisonResolver) {
      return null
      // throw new Error('No versionComparisonResolver provided')
    }

    return await versionComparisonResolver(
      version,
      packageId,
      previousVersion,
      previousVersionPackageId,
    )
  }

  async versionOperationsResolver(
    apiType: OperationsApiType,
    version?: string,
    packageId?: string,
    operationIds?: OperationId[],
    includeData = true,
  ): Promise<ResolvedOperations | null> {
    if (!version) {
      return null
    }

    packageId = packageId ?? this.config.packageId

    if (this.canBeResolvedLocally(version, packageId)) {
      const currentOperations = operationIds ? this.operationList.filter(({ operationId }) => operationIds.includes(operationId)) : this.operationList
      return { operations: currentOperations }
    }

    const { versionOperationsResolver } = this.params.resolvers
    if (!versionOperationsResolver) {
      throw new Error('No versionOperationsResolver provided')
    }

    const operations = await versionOperationsResolver(
      apiType,
      version,
      packageId,
      operationIds,
      includeData,
    )

    // validate for missing operationData
    if (includeData && operations?.operations) {
      for (const { data, operationId } of operations.operations) {
        if (data) {
          continue
        }

        this.notifications.push({
          severity: MESSAGE_SEVERITY.Warning,
          message: `No data for operation ${operationId} of package ${packageId}/${version}`,
        })
      }
    }

    return operations
  }

  async versionDocumentsResolver(
    apiType: OperationsApiType,
    version: VersionId,
    packageId: PackageId,
    filterByOperationGroup: string,
  ): Promise<ResolvedDocuments | null> {
    packageId = packageId ?? this.config.packageId

    const { versionDocumentsResolver } = this.params.resolvers
    if (!versionDocumentsResolver) {
      throw new Error('No versionDocumentsResolver provided')
    }

    const documents = await versionDocumentsResolver(
      apiType,
      version,
      packageId,
      filterByOperationGroup,
    )

    if (!documents?.documents.length) {
      this.notifications.push({
        severity: MESSAGE_SEVERITY.Warning,
        message: `No documents for ${packageId}/${version} that match the criteria (apiType=${apiType}, filterByOperationGroup=${filterByOperationGroup})`,
      })

      if (!documents?.documents.every(document => document.data)) {
        this.notifications.push({
          severity: MESSAGE_SEVERITY.Warning,
          message: `Not all documents have data for ${packageId}/${version} that match the criteria (apiType=${apiType}, filterByOperationGroup=${filterByOperationGroup})`,
        })
      }
    }

    return documents
  }

  async versionDeprecatedResolver(
    apiType: OperationsApiType,
    version?: string,
    packageId?: string,
    operationIds?: OperationId[],
  ): Promise<ResolvedDeprecatedOperations | null> {
    if (!version) { return null }

    const packageKey = packageId ?? this.config.packageId

    if (this.canBeResolvedLocally(version, packageId)) {
      const currentOperations = this.operationList.filter(({
        deprecatedItems,
        operationId,
      }) => (!operationIds || operationIds?.includes(operationId)) && deprecatedItems?.length)
      return { operations: currentOperations }
    }

    const { versionDeprecatedResolver } = this.params.resolvers
    if (!versionDeprecatedResolver) {
      throw new Error('No versionDeprecatedResolver provided')
    }

    return await versionDeprecatedResolver(
      apiType,
      version,
      packageKey,
      operationIds,
    )
  }

  private canBeResolvedLocally(version: string, packageId: string | undefined): boolean {
    return this.config.buildType !== BUILD_TYPE.CHANGELOG &&
      this.config.buildType !== BUILD_TYPE.PREFIX_GROUPS_CHANGELOG &&
      version === this.config.version &&
      packageId === this.config.packageId
  }

  async versionResolver(
    version: string,
    packageId: string,
  ): Promise<VersionCache | null> {
    const compositeKey = getCompositeKey(packageId, version)

    if (this.canBeResolvedLocally(version, packageId)) {
      return this.currentVersion
    }

    const cachedVersion = this.versionsCache.get(compositeKey)
    if (cachedVersion) {
      return cachedVersion
    }

    const { versionResolver } = this.params.resolvers
    if (!versionResolver) {
      throw new Error('No versionResolver provided')
    }

    const versionContent = await versionResolver(packageId, version, true)

    if (!versionContent) {
      this.notifications.push({
        severity: MESSAGE_SEVERITY.Error,
        message: `No such version: version: ${version}, packageId: ${packageId}`,
      })
      return null
    }

    const versionCache = {
      ...versionContent,
      packageId: packageId,
    }
    this.versionsCache.set(compositeKey, versionCache)

    return versionCache
  }

  async versionReferencesResolver(
    version: string,
    packageId?: string,
  ): Promise<BuildConfigRef[]> {
    if (!version) {
      return []
    }

    const compositeKey = getCompositeKey(packageId || this.config.packageId, version)

    const { versionReferencesResolver } = this.params.resolvers
    if (!versionReferencesResolver) {
      throw new Error('No versionReferencesResolver provided')
    }

    if (this.canBeResolvedLocally(version, packageId)) {
      return this.config?.refs ?? []
    }

    const cachedVersion = this.referencesCache.get(compositeKey)
    if (cachedVersion) {
      return cachedVersion
    }

    const versionReferences = await versionReferencesResolver(
      version,
      packageId || this.config.packageId,
    )

    if (!versionReferences) {
      this.notifications.push({
        severity: MESSAGE_SEVERITY.Error,
        message: `No version references for: version: ${version}, packageId: ${packageId || this.config.packageId}`,
      })
      return []
    }

    const referencesCache: BuildConfigRef[] = Object.values(versionReferences.packages ?? {}).filter(pack => !pack.deletedAt).map(pack => ({ refId: pack.refId, version: pack.version }))
    this.referencesCache.set(compositeKey, referencesCache)

    return referencesCache
  }

  private get currentVersion(): VersionCache {
    return {
      packageId: this.config.packageId,
      version: this.config.version,
      revision: 0,
      operationTypes: this.operationsTypes,
    }
  }

  private get operationsTypes(): OperationTypes[] {
    const operationsTypes: OperationTypes[] = []

    for (const apiType of this.existingOperationsApiTypes) {
      const operationsHashMap = this.operationsHashMapByApiType(apiType)
      operationsTypes.push({
        apiType: apiType,
        operations: operationsHashMap,
      })
    }

    return operationsTypes
  }

  private get existingOperationsApiTypes(): Set<OperationsApiType> {
    const apiTypes: OperationsApiType[] = this.operationList.map(({ apiType }) => apiType) ?? []

    return new Set(apiTypes)
  }

  private operationsHashMapByApiType(operationsApiType: OperationsApiType): ResolvedVersionOperationsHashMap {
    const hashMap: ResolvedVersionOperationsHashMap = {}

    for (const { apiType, operationId, dataHash } of this.operations.values()) {
      if (apiType === operationsApiType) {
        hashMap[operationId] = dataHash
      }
    }

    return hashMap
  }

  async parseFile(fileId: string, source: Blob): Promise<File | null> {
    if (this.parsedFiles.has(fileId)) {
      return this.parsedFiles.get(fileId) ?? null
    }

    if (SUPPORTED_FILE_FORMATS.includes(getFileExtension(fileId))) {
      for (const { parser } of this.apiBuilders) {
        try {
          // todo check source.type
          const result = await parser(fileId, source)

          if (result) {
            // add errors to notifications
            if (result.kind === FILE_KIND.TEXT && result.errors) {
              result.errors.forEach((error) => {
                this.notifications.push({
                  fileId: fileId,
                  severity: MESSAGE_SEVERITY.Error,
                  message: `Invalid ${result.type} file. ${error.message || ''}`,
                })
              })
            }

            this.parsedFiles.set(fileId, result)
            return result
          }
        } catch (error) {
          throw new Error(`Cannot parse file ${fileId}. ${error instanceof Error ? error.message : ''}`)
        }
      }
    }

    const parsedFile = unknownParsedFile(fileId, source)
    this.parsedFiles.set(fileId, parsedFile)
    return parsedFile
  }

  setDocument(document: VersionDocument, operations: ApiOperation[] = []): void {
    this.documents.set(document.fileId, document)
    for (const operation of operations) {
      this.operations.set(operation.operationId, operation)
    }
  }

  async update(
    config: BuildConfig,
    changedFiles: FileId[] = [],
    options: BuilderRunOptions = DEFAULT_RUN_OPTIONS,
    versionCandidate = 'version-candidate',
  ): Promise<BuildResult> {
    if (options?.cleanCache) {
      this.clearCaches()
    } else {
      this.clearRuntimeCachesOnly()
    }

    validateConfig(this.config)
    const previousConfig = { ...this.config }
    this.config = config
    const { version, packageId, previousVersion, previousVersionPackageId } = this.config

    this.removeOutdatedCaches(changedFiles, previousConfig)
    await this.rebuildChangedFiles(changedFiles)

    const needToRecalculateComparisons = (previousConfig.previousVersion !== previousVersion || !!changedFiles.length) && !options.withoutChangelog

    if (needToRecalculateComparisons && previousVersion) {
      !options.withoutDeprecatedDepth && await calculateHistoryForDeprecatedItems(
        REST_API_TYPE,
        this.operationList,
        previousVersion,
        this.config.previousVersionPackageId || this.config.packageId,
        this.builderContext(config),
      )
      this.comparisons = await compareVersions(
        [previousVersion, previousVersionPackageId || packageId],
        [version, packageId],
        this.compareContext(this.config),
      )
    } else if (!previousVersion) {
      this.comparisons = []
    }

    if (version !== previousConfig.version) {
      this.replaceVersionCandidateWithConfigVersion(versionCandidate, config)
    }

    this.updateDocumentLabelsFromConfig(config)

    return this.buildResult
  }

  private removeOutdatedCaches(changedFiles: FileId[], previousConfig: BuildConfig): void {
    // delete updated files from cache
    for (const id of changedFiles) {
      this.parsedFiles.delete(id)
    }

    // delete removed documents and operations
    const removedFileIds = filesDiff(previousConfig.files!, this.config.files!).map(({ fileId }) => fileId)
    for (const removedFileId of removedFileIds) {
      const document = this.documents.get(removedFileId)

      document?.operationIds.forEach(operationId => {
        this.operations.delete(operationId)
      })

      this.documents.delete(removedFileId)
    }
  }

  private async rebuildChangedFiles(changedFileIds: FileId[]): Promise<void> {
    // build only changed or added files
    if (changedFileIds.length) {
      this.basePath = findSharedPath(this.config.files!.map(({ fileId }) => fileId).filter(Boolean))
      await this.rebuildFiles(this.config.files!.filter(file => changedFileIds.includes(file.fileId)))
    }
  }

  private updateDocumentLabelsFromConfig(config: BuildConfig): void {
    // update labels
    config.files?.forEach(({ fileId, labels }) => {
      if (this.documents.has(fileId)) {
        this.documents.get(fileId)!.metadata.labels = labels
      }
    })
  }

  private replaceVersionCandidateWithConfigVersion(versionCandidate: string, config: BuildConfig): void {
    for (const comparison of this.comparisons) {
      if (comparison.version === versionCandidate) {
        comparison.comparisonFileId = comparison.comparisonFileId?.replace(versionCandidate, config.version)
        comparison.version = config.version
      }
    }

    const getUpdatedDeprecatedInPreviousVersions = (deprecatedInPreviousVersions: string[]): string[] => {
      const result = new Set(deprecatedInPreviousVersions.map(version => (version === versionCandidate ? config.version : version)))

      if (config.status === VERSION_STATUS.RELEASE) {
        result.add(config.version)
      }

      return Array.from(result.values())
    }

    for (const operation of this.operationList) {
      if (operation?.deprecatedInPreviousVersions?.length) {
        operation.deprecatedInPreviousVersions = getUpdatedDeprecatedInPreviousVersions(operation.deprecatedInPreviousVersions)
      }

      if (!operation.deprecatedItems) {
        continue
      }

      for (const deprecatedItem of operation.deprecatedItems) {
        deprecatedItem.deprecatedInPreviousVersions = getUpdatedDeprecatedInPreviousVersions(deprecatedItem.deprecatedInPreviousVersions)
      }
    }
  }

  private async rebuildFiles(changedFiles: BuildConfigFile[]): Promise<void> {
    for (const changedFile of changedFiles) {
      const previousDocument = this.documents.get(changedFile.fileId)
      // remove current operations
      if (previousDocument) {
        previousDocument.operationIds?.forEach(operationId => {
          this.operations.delete(operationId)
        })

        this.documents.delete(previousDocument.fileId)
      }
    }

    const buildFilesResult = await buildFiles(changedFiles, this.builderContext(this.config))
    for (const { document, operations = [] } of buildFilesResult) {
      this.setDocument(document, operations)
    }
  }

  clearRuntimeCachesOnly(): void {
    this.notifications = []
  }

  clearCaches(): void {
    this.versionsCache.clear()
    this.referencesCache.clear()
    this.packageChangesCache.clear()
    this.operations.clear()
    this.documents.clear()
    this.comparisons = []

    this.notifications = []
  }
}
