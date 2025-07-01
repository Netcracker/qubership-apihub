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
  FileId,
  TemplatePath,
  PackageVersionBuilder,
  ResolvedGroupDocuments,
  ResolvedVersionDocuments,
  ResolvedPackage,
} from '@netcracker/qubership-apihub-api-processor'
import { ConfigService } from '@nestjs/config'
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import AdmZip from 'adm-zip'

import { RegistryService } from '../registry/registry.service'
import { PublishFilesConfigType } from './builder.schema'
import { BuildStatus, SOURCES_FOLDER } from './builder.constants'
import { BehaviorSubject, filter, interval, tap } from 'rxjs'
import { handleServerError } from '../../utils/errors'
import { Task } from 'src/types'
import { EMPTY_OPERATIONS, OperationDto, toVersionOperation } from './builder.utils'
import fs from 'fs/promises'
import path from 'path'

@Injectable()
export class BuilderService implements OnModuleInit {
  private logger = new Logger('BuilderService', { timestamp: true })

  private statusInterval = this.config.get<number>('statusInterval')
  private requestInterval = this.config.get<number>('requestInterval')
  private operationsBatch = this.config.get<number>('operationsBatch')

  private builder$ = new BehaviorSubject<Task | null>(null)
  private finder$ = new BehaviorSubject<boolean>(true)
  private isBuilding$ = new BehaviorSubject<boolean>(false)
  private isFinding$ = new BehaviorSubject<boolean>(true)

  private requestInterval$ = interval(this.requestInterval).pipe(
    filter(() => !this.isBuilding$.value && this.isFinding$.value),
    tap(() => this.finder$.next(true)),
  )

  constructor(
    private readonly registry: RegistryService,
    private config: ConfigService,
  ) {}

  onModuleInit(): void {
    this.requestInterval$.subscribe()

    this.builder$.pipe(
      filter((value): value is Task => !!value),
    ).subscribe(async (task) => {
      this.setBuilding(true)

      try {
        const { configJson, sources, builderId } = task
        const config: PublishFilesConfigType = JSON.parse(configJson)
        // TODO: validate params
        this.logger.log(`[Builder Service] Starting build for publishId: ${config.publishId}`)
        this.logger.log(`[Builder Service] version: ${config.packageId}/${config.version} previous version: ${config.previousVersionPackageId ?? config.packageId}/${config.previousVersion}`)
        this.logger.log(`[Builder Service] Builder id: ${builderId}`)
        await this.startBuildJob(config, builderId, sources)
      } catch (err) {
        this.logger.error(err)
      }

      this.setBuilding(false)
      this.setFinding(true)
      this.logger.log('[Builder Service] Finish build')
    })

    this.finder$.subscribe(async () => {
      this.setFinding(false)
      try {
        const task = await this.registry.findTask()

        if (task) {
          this.logger.debug('[Finder] New task found')
          return this.builder$.next(task)
        }
      } catch (err) {
        console.log(err)
      }

      this.setFinding(true)
    })
  }

  private setBuilding(state: boolean): void {
    this.isBuilding$.next(state)
  }

  private setFinding(state: boolean): void {
    this.isFinding$.next(state)
  }

  public async startBuildJob(
    config: PublishFilesConfigType,
    builderId: string,
    sources?: AdmZip,
  ) {
    const timer = setInterval(() => {
      this.logger.log(`[Builder Service] Memory usage ${JSON.stringify(process.memoryUsage())}`)
      this.logger.debug('[Send Running] Running post build status request')
      this.registry.postBuildStatus(config.packageId, config.publishId, builderId, BuildStatus.RUNNING).catch((error) => {
        this.logger.error(error)
        clearInterval(timer)
      })
    }, this.statusInterval)

    try {
      const { packageVersion, exportFileName } = await this.buildVersionFile(config, sources)
      clearInterval(timer)

      this.logger.debug('[Send Result] Start post build status request')
      await this.registry.postBuildStatus(config.packageId, config.publishId, builderId, BuildStatus.COMPLETE, packageVersion, exportFileName)
      this.logger.debug('[Send Result] Finish post build status request')
    } catch (error) {
      handleServerError(error)
      clearInterval(timer)
      this.registry.postBuildStatus(config.packageId, config.publishId, builderId, BuildStatus.ERROR, error).catch((error) => {
        this.logger.error(error)
        handleServerError(error)
      })
    }
  }

  async buildVersionFile(
    config: PublishFilesConfigType,
    sources?: AdmZip,
  ): Promise<{ packageVersion: Buffer, exportFileName?: string }> {
    const fileKeys = sources ? sources.getEntries().map(({ entryName }) => entryName) : null

    const builder = new PackageVersionBuilder(config, {
      resolvers: {
        templateResolver: async (templatePath: TemplatePath): Promise<Blob | null> => {
          try {
            const template = await fs.readFile(path.join(__dirname, '..', '..', 'templates', templatePath))
            return new Blob([template])
          } catch (error) {
            if (error instanceof Error) {
              this.logger.error(`[Builder Service] Error during reading template ${error.message}`, error.stack)
            } else {
              this.logger.error(`[Builder Service] Unknown error while reading template: ${JSON.stringify(error)}`)
            }
            return null
          }
        },
        fileResolver: async (fileId: FileId): Promise<Blob | null> => {
          const fullPath = `${SOURCES_FOLDER}/${fileId}`
          const filePath = fileKeys?.find((key) => key.includes(fullPath))
          if (!filePath || !fileKeys || !sources) {
            return null
          }
          const file = sources.readFile(fullPath)
          if (!file) {
            this.logger.error(`[Builder Service] Error during reading file ${fullPath} from sources`)
            return null
          }

          return new Blob([file])
        },
        versionResolver: async (packageId, version, includeOperations) => {
          this.logger.debug(`[Builder Service] Start fetching version config(${version})`)
          const response = await this.registry.getVersionConfig(version, packageId || config.packageId, includeOperations)
          this.logger.debug('[Builder Service] Finish fetching version config')
          return response
        },
        packageResolver: async (packageId: string): Promise<ResolvedPackage | null> => {
          this.logger.debug(`[Builder Service] Start fetching package (${packageId})`)
          const response = await this.registry.getPackage(packageId)
          this.logger.debug('[Builder Service] Finish fetching package')
          return response
        },
        versionReferencesResolver: async (version, packageId) => {
          this.logger.log(`[Builder Service] Start fetching version references for (${packageId}/${version})`)
          const versionReferences = await this.registry.getVersionReferences(version, packageId)
          this.logger.log('[Builder Service] Finish fetching version references')

          if (!versionReferences) {
            return null
          }

          return versionReferences
        },
        versionComparisonResolver: async (version, packageId, previousVersion, previousVersionPackageId) => {
          this.logger.log(`[Builder Service] Start fetching version comparison for (${packageId}/${version} vs ${previousVersionPackageId}/${previousVersion})`)
          const comparison = await this.registry.getVersionComparison(version, packageId, previousVersion, previousVersionPackageId)
          this.logger.log('[Builder Service] Finish fetching version comparison')

          if (!comparison) {
            return null
          }

          return comparison
        },
        versionOperationsResolver: async (apiType, version, packageId, operationsIds, includeData) => {
          this.logger.debug(`[Builder Service] Start fetching operations for version (${version})`)
          const limit = includeData ? 100 : 1000
          const result: OperationDto[] = []
          let page = 0
          let operationsCount = 0
          while (page === 0 || operationsCount === limit) {
            const { operations } = await this.registry.getVersionOperations(
              apiType,
              version,
              packageId || config.packageId,
              !!includeData,
              operationsIds,
              limit,
              page,
            ) ?? EMPTY_OPERATIONS
            page += 1
            result.push(...operations)
            operationsCount = operations.length
          }
          this.logger.debug('[Builder Service] Finish fetching version operations')
          return { operations: result.map(toVersionOperation) }
        },
        versionDeprecatedResolver: async (apiType, version, packageId, operationsIds) => {
          this.logger.debug(`[Builder Service] Start fetching deprecated operations for version (${version})`)
          const response = await this.registry.getDeprecatedOperations(apiType, operationsIds, version, packageId || config.packageId)
          this.logger.debug('[Builder Service] Finish fetching deprecated operations')
          return response
        },
        groupDocumentsResolver: async (apiType, version, packageId, filterByOperationGroup) => {
          this.logger.debug(`[Builder Service] Start fetching documents for operation group (${filterByOperationGroup})`)
          const response: ResolvedGroupDocuments = { documents: [], packages: {} }

          const LIMIT = 100
          let page = 0

          let documentsCount = LIMIT
          do {
            const { documents, packages } = await this.registry.getGroupDocuments(
              apiType,
              version,
              packageId || config.packageId,
              filterByOperationGroup,
              page,
              LIMIT,
            ) ?? { documents: [], packages: {} }

            response.documents = [...response.documents, ...documents]
            response.packages = { ...response.packages, ...packages }

            page += 1
            documentsCount = documents.length
          } while (documentsCount === LIMIT)

          this.logger.debug('[Builder Service] Finish fetching operation group documents')
          return response
        },
        versionDocumentsResolver: async (version, packageId, apiType) => {
          this.logger.debug(`[Builder Service] Start fetching documents for version (${version})`)
          const response: ResolvedVersionDocuments = { documents: [], packages: {} }

          const LIMIT = 100
          let page = 0

          let documentsCount = LIMIT
          do {
            const { documents, packages } = await this.registry.getVersionDocuments(
              version,
              packageId || config.packageId,
              page,
              LIMIT,
              apiType,
            ) ?? { documents: [], packages: {} }

            response.documents = [...response.documents, ...documents]
            response.packages = { ...response.packages, ...packages }

            page += 1
            documentsCount = documents.length
          } while (documentsCount === LIMIT)

          this.logger.debug('[Builder Service] Finish fetching version documents')
          return response
        },
        groupExportTemplateResolver: async (apiType, version, packageId, filterByOperationGroup): Promise<string> => {
          this.logger.debug(`[Builder Service] Start fetching template file for version (${version})`)
          const template = await this.registry.getGroupExportTemplate(packageId, version, apiType, filterByOperationGroup)
          this.logger.debug('[Builder Service] Finish fetching template file')
          return template
        },
        rawDocumentResolver: async (version, packageId, slug): Promise<File | null> => {
          this.logger.debug(`[Builder Service] Start fetching raw file for version (${version})`)
          const file = await this.registry.getPublishedDocumentRaw(packageId, version, slug)
          this.logger.debug('[Builder Service] Finish fetching raw file')
          return file
        },
      },
      configuration: {
        batchSize: this.operationsBatch,
      },
    })

    const { noChangeLog = false, buildType = 'build' } = config as any
    const withoutChangelog = noChangeLog && buildType === 'build'
    withoutChangelog && this.logger.log('[Builder Service] Run build without changelog')

    //override native logger
    console.debug = (message: string) => {
      this.logger.debug(message)
    }
    const result = await builder.run({ withoutChangelog })
    this.logger.log(`[Builder Service] Built ${result.operations.size ?? 0} operations from ${config.packageId}/${config.version}`)

    return await builder.createNodeVersionPackage()
  }
}
