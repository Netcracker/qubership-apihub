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
  ChangeSummary,
  EMPTY_CHANGE_SUMMARY,
  FILE_FORMAT,
  GRAPHQL_API_TYPE,
  graphqlApiBuilder,
  NotificationMessage,
  OperationId,
  OperationsApiType,
  PACKAGE,
  PackageNotifications,
  PackageVersionBuilder,
  ReferenceElement,
  ResolvedComparisons,
  ResolvedComparisonSummary,
  ResolvedDeprecatedOperation,
  ResolvedDeprecatedOperations,
  ResolvedDocument,
  ResolvedDocuments,
  ResolvedOperation,
  ResolvedOperations,
  ResolvedReferenceMap,
  ResolvedReferences,
  ResolvedVersion,
  ResolvedVersionOperationsHashMap,
  REST_API_TYPE,
  restApiBuilder,
  REVISION_DELIMITER,
  textApiBuilder,
  unknownApiBuilder,
  VERSION_STATUS,
  VersionDocument,
  VersionDocuments,
  VersionsComparison,
} from '../../../src'
import {
  getOperationsFileContent,
  saveComparisonsArray,
  saveDocumentsArray,
  saveEachComparison,
  saveEachDocument,
  saveEachOperation,
  saveInfo,
  saveNotifications,
  saveOperationsArray,
} from './utils'
import { getCompositeKey, getSplittedVersionKey, isNotEmpty, toBase64 } from '../../../src/utils'
import { groupBy } from 'graphql/jsutils/groupBy'
import { IRegistry } from './types'
import { calculateTotalChangeSummary } from '../../../src/components/compare'

const VERSIONS_PATH = 'test/versions'
const DEFAULT_PROJECTS_PATH = 'test/projects'

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
      versionResolver: this.versionResolver.bind(this),
      versionOperationsResolver: this.versionOperationsResolver.bind(this),
      versionReferencesResolver: this.versionReferencesResolver.bind(this),
      versionComparisonResolver: this.versionComparisonResolver.bind(this),
      versionDeprecatedResolver: this.versionDeprecatedResolver.bind(this),
      versionDocumentsResolver: this.versionDocumentsResolver.bind(this),
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

  async versionResolver(
    packageId = '',
    version: string,
  ): Promise<ResolvedVersion | null> {
    const {
      config,
      operations,
      comparisons = [],
    } = await this.getVersion(packageId, getSplittedVersionKey(version)[0]) || {}

    if (!config) {
      return null
    }

    const getChangesSummary = (apiType: OperationsApiType): ChangeSummary => {
      return calculateTotalChangeSummary(
        comparisons.map(
          comparison => comparison.operationTypes.find(type => type.apiType === apiType)?.changesSummary ?? EMPTY_CHANGE_SUMMARY,
        ),
      )
    }

    const apiTypeMap = groupBy([...operations?.values() ?? []], (operation) => operation.apiType)

    const getOperationsHashMap = (apiType: OperationsApiType): ResolvedVersionOperationsHashMap => apiTypeMap.get(apiType)?.reduce((accumulator, {
      dataHash,
      operationId,
    }) => {
      return {
        ...accumulator,
        [operationId]: dataHash,
      } as Record<string, string>
    }, {}) ?? {}
    const restOperations = getOperationsHashMap(REST_API_TYPE)
    const gqlOperations = getOperationsHashMap(GRAPHQL_API_TYPE)

    return {
      ...config,
      apiTypes: [REST_API_TYPE, GRAPHQL_API_TYPE],
      createdAt: 'unknown',
      createdBy: 'builder',
      versionLabels: [],
      revision: 0,
      operationTypes: [
        {
          apiType: REST_API_TYPE,
          changesSummary: getChangesSummary(REST_API_TYPE),
          operations: restOperations,
        },
        {
          apiType: GRAPHQL_API_TYPE,
          changesSummary: getChangesSummary(GRAPHQL_API_TYPE),
          operations: gqlOperations,
        },
      ],
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
      ?.filter(id => operations?.has(id))
      .map((id) => ({
        ...operations!.get(id)!,
        data: includeData ? operations?.get(id)?.data : undefined,
      }))

    return { operations: versionOperations }
  }

  async versionDocumentsResolver(
    apiType: OperationsApiType,
    version: string,
    packageId: string,
    filterByOperationGroup: string,
  ): Promise<ResolvedDocuments | null> {
    const { documents } = await this.getVersion(packageId || this.packageId, version) ?? {}

    const filterOperationIdsByGroup = (id: string): boolean => this.groupToOperationIdsMap[filterByOperationGroup]?.includes(id)
    const versionDocuments: ResolvedDocument[] = [...documents?.values() ?? []]
      .filter(versionDocument => versionDocument.operationIds.some(filterOperationIdsByGroup))
      .map(versionDocument => {
        return {
          version: versionDocument.version,
          fileId: versionDocument.fileId,
          slug: versionDocument.slug,
          type: versionDocument.type,
          format: versionDocument.format,
          filename: versionDocument.filename,
          labels: [],
          title: versionDocument.title,
          includedOperationIds: versionDocument.operationIds.filter(filterOperationIdsByGroup),
          data: toBase64(JSON.stringify(versionDocument.data)),
        }
      })

    return { documents: versionDocuments }
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
            versionRevision: 0,
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

  async publish(projectId: string, publishParams?: Partial<BuildConfig>): Promise<void> {
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
    await saveEachDocument(documents, basePath, builderContext)

    await saveOperationsArray(operations, basePath)
    await saveEachOperation(operations, basePath)

    await saveComparisonsArray(comparisons, basePath)
    await saveEachComparison(comparisons, basePath)
    await saveNotifications(notifications, basePath)
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

  async getVersion(packageId: string, version: string): Promise<PackageVersionCache | undefined> {
    const [verisonKey] = getSplittedVersionKey(version)
    const compositeKey = getCompositeKey(packageId, verisonKey)
    if (this.versions.has(compositeKey)) {
      return this.versions.get(compositeKey)
    }

    const versionConfig = await loadConfig(
      VERSIONS_PATH,
      `${packageId}/${verisonKey}`,
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
      `${packageId}/${verisonKey}`,
      PACKAGE.OPERATIONS_FILE_NAME,
    )

    const { operations } = operationsFile ? JSON.parse(operationsFile) : null as ResolvedOperations | null ?? { operations: [] }

    for (const operation of operations) {
      if (!operation) {
        continue
      }

      const data = await loadFileAsString(
        VERSIONS_PATH,
        `${packageId}/${verisonKey}/${PACKAGE.OPERATIONS_DIR_NAME}`,
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
      `${packageId}/${verisonKey}`,
      PACKAGE.DOCUMENTS_FILE_NAME,
    )
    const { documents } = documentsFile ? JSON.parse(documentsFile) : null as VersionDocuments | null ?? { documents: [] }
    for (const document of documents) {
      const data = await loadFileAsString(
        VERSIONS_PATH,
        `${packageId}/${verisonKey}/${PACKAGE.DOCUMENTS_DIR_NAME}`,
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
      `${packageId}/${verisonKey}`,
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
      `${packageId}/${verisonKey}`,
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
