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

import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { catchError, lastValueFrom, map, ObservableInput, of, retry, throwError, timer } from 'rxjs'
import FormData from 'form-data'
import { BuildStatus } from '../builder/builder.constants'
import { getResponseError } from '../../utils/errors'
import {
  ResolvedDeprecatedOperations,
  ResolvedGroupDocuments,
  ResolvedPackage,
  ResolvedVersion,
  ResolvedVersionDocuments,
} from '@netcracker/qubership-apihub-api-processor'
import AdmZip from 'adm-zip'
import { toBackendBuildStatus } from 'src/utils/mapper'
import { Task } from 'src/types'
import { OperationsDto } from '../builder/builder.utils'

@Injectable()
export class RegistryService implements OnModuleInit {
  private logger = new Logger('BuilderService', { timestamp: true })
  private baseUrl = 'http://' + this.configService.get<string>('apihubUrl')
  private apiKey = this.configService.get<string>('apiKey')
  private headers: any

  constructor(
    @Inject('builderId') private builderId: string,
    private readonly httpService: HttpService,
    private configService: ConfigService,
  ) { }

  onModuleInit(): void {
    this.headers = {
      'api-key': this.apiKey,
    }
  }

  public async findTask(): Promise<Task | null> {
    const newTaskUrl = `${this.baseUrl}/api/v2/builders/${this.builderId}/tasks`
    const logTag = '[findTask]'
    return lastValueFrom(this.httpService
      .post(newTaskUrl, null, { headers: { ...this.headers }, responseEncoding: 'binary' })
      .pipe(
        retry({ delay: this.requestRetryHandler(logTag) }),
        map(async (response) => {
          if (!response.data) { return null }

          const zippedData = new AdmZip(Buffer.from(response.data, 'binary'))

          const configJson = zippedData.readAsText('config.json')
          return {
            configJson: configJson,
            sources: zippedData,
            builderId: this.builderId,
          }
        }),
        catchError(err => {
          this.logger.error(logTag, err?.response?.data ?? err)
          return of(null)
        }),
      ),
    )
  }

  public async postBuildStatus(packageId: string, publishId: string, builderId: string, status: BuildStatus, data?: any, exportFileName?: string): Promise<void> {
    const formData = new FormData()
    formData.append('status', toBackendBuildStatus(status))
    // todo: uncomment the code below after the backend starts to support asynchronous publishing
    // formData.append('status', toBackendBuildStatus(status, true))
    formData.append('builderId', builderId)
    if (status === BuildStatus.ERROR) {
      const errorMessage = getResponseError(data?.response?.data) ?? `${data}`
      const debugMessage = data?.response?.data?.debug ?? ''
      formData.append('errors', debugMessage ? `${errorMessage} (debug: ${debugMessage})` : errorMessage)
      this.logger.error(`[POST Build Status] Sending error ${errorMessage}`)
    } else if (status === BuildStatus.COMPLETE) {
      formData.append('data', data, exportFileName ?? 'package.zip')
      this.logger.log(`[POST Build Status] Sending completed`)
    }

    const encodedPackageKey = encodeURIComponent(packageId)
    const publishStatusUrl = `${this.baseUrl}/api/v3/packages/${encodedPackageKey}/publish/${publishId}/status`
    // const publishStatusUrl = `${this.baseUrl}/api/v3/packages/${encodedPackageKey}/publish/${publishId}/status/async`
    return lastValueFrom(this.httpService
      .post(publishStatusUrl, formData, { headers: { ...formData.getHeaders(), ...this.headers } })
      .pipe(
        retry({ delay: this.requestRetryHandler('[postBuildStatus]') }),
        map((response) => response.data),
      ),
    )
  }

  public async getVersionReferences(versionId: string, packageId: string) {
    const encodedPackageKey = encodeURIComponent(packageId)
    const encodedVersionKey = encodeURIComponent(versionId)

    const versionReferencesUrl = `${this.baseUrl}/api/v3/packages/${encodedPackageKey}/versions/${encodedVersionKey}/references`
    this.logger.debug('Fetch version references from ', versionReferencesUrl)
    const logTag = '[getVersionReferences]'

    return lastValueFrom(this.httpService
      .get(versionReferencesUrl, { headers: this.headers })
      .pipe(
        retry({ delay: this.requestRetryHandler(logTag) }),
        map((response) => response.data),
        catchError(err => {
          this.logger.error(logTag, err?.response?.data ?? err)
          return of(null)
        }),
      ),
    )
  }

  public async getVersionComparison(versionId: string, packageId: string, previousVersionId: string, previousVersionPackageId: string) {
    const queryParams = new URLSearchParams()
    queryParams.append('previousVersion', `${previousVersionId}`)
    queryParams.append('previousVersionPackageId', `${previousVersionPackageId}`)

    const encodedPackageKey = encodeURIComponent(packageId)
    const encodedVersionKey = encodeURIComponent(versionId)

    const versionComparisonSummaryUrl = `${this.baseUrl}/api/v2/packages/${encodedPackageKey}/versions/${encodedVersionKey}/changes/summary?${queryParams}`
    this.logger.debug('Fetch version comparison from: ', versionComparisonSummaryUrl)
    const logTag = '[getVersionComparison]'

    return lastValueFrom(this.httpService
      .get(versionComparisonSummaryUrl, { headers: this.headers })
      .pipe(
        retry({ delay: this.requestRetryHandler(logTag) }),
        map(({ data }) => data),
        catchError(err => {
          this.logger.error(logTag, err?.response?.data ?? err)
          return of(null)
        }),
      ),
    )
  }

  public async getVersionOperations(apiType: string, version: string, packageId: string, includeData: boolean, operationsIds?: string[], limit = 100, page?: number): Promise<OperationsDto | null> {
    const queryParams = new URLSearchParams()
    queryParams.append('includeData', `${includeData}`)
    queryParams.append('limit', `${limit}`)
    page && queryParams.append('page', `${page}`)
    operationsIds && operationsIds.length && queryParams.append('ids', `${operationsIds.join(',')}`)

    const encodedPackageKey = encodeURIComponent(packageId)
    const encodedVersionKey = encodeURIComponent(version)

    const versionFileUrl = `${this.baseUrl}/api/v2/packages/${encodedPackageKey}/versions/${encodedVersionKey}/${apiType}/operations?${queryParams}`
    this.logger.debug('Fetch operation: ', versionFileUrl)
    const logTag = '[getVersionOperations]'

    return lastValueFrom(this.httpService
      .get(versionFileUrl, { headers: this.headers })
      .pipe(
        retry({ delay: this.requestRetryHandler(logTag) }),
        map(({ data }) => data),
        catchError(err => {
          this.logger.error(logTag, err?.response?.data ?? err)
          return of(null)
        }),
      ),
    )
  }

  public async getGroupDocuments(apiType: string, version: string, packageId: string, filterByOperationGroup: string, page: number, limit = 100): Promise<ResolvedGroupDocuments | null> {
    const queryParams = new URLSearchParams()
    queryParams.append('limit', `${limit}`)
    queryParams.append('page', `${page}`)

    const encodedPackageKey = encodeURIComponent(packageId)
    const encodedVersionKey = encodeURIComponent(version)
    const encodedGroupName = encodeURIComponent(filterByOperationGroup)

    const versionDocumentsUrl = `${this.baseUrl}/api/v3/packages/${encodedPackageKey}/versions/${encodedVersionKey}/${apiType}/groups/${encodedGroupName}/documents?${queryParams}`
    this.logger.debug(`Fetch operation group documents (page=${page}): `, versionDocumentsUrl)
    const logTag = '[getGroupDocuments]'

    return lastValueFrom(this.httpService
      .get(versionDocumentsUrl, { headers: this.headers })
      .pipe(
        retry({ delay: this.requestRetryHandler(logTag) }),
        map(({ data }) => data),
        catchError(err => {
          this.logger.error(logTag, err?.response?.data ?? err)
          return of(null)
        }),
      ),
    )
  }

  public async getVersionDocuments(version: string, packageId: string, page: number, limit = 100, apiType?: string): Promise<ResolvedVersionDocuments | null> {
    const queryParams = new URLSearchParams()
    apiType && queryParams.append('apiType', `${apiType}`)
    queryParams.append('limit', `${limit}`)
    queryParams.append('page', `${page}`)

    const encodedPackageKey = encodeURIComponent(packageId)
    const encodedVersionKey = encodeURIComponent(version)

    const versionDocumentsUrl = `${this.baseUrl}/api/v2/packages/${encodedPackageKey}/versions/${encodedVersionKey}/documents?${queryParams}`
    this.logger.debug(`Fetch version documents (page=${page}): `, versionDocumentsUrl)
    const logTag = '[getVersionDocuments]'

    return lastValueFrom(this.httpService
      .get(versionDocumentsUrl, { headers: this.headers })
      .pipe(
        retry({ delay: this.requestRetryHandler(logTag) }),
        map(({ data }) => data),
        catchError(err => {
          this.logger.error(logTag, err?.response?.data ?? err)
          return of(null)
        }),
      ),
    )
  }

  public async getDeprecatedOperations(apiType: string, operations: string[] | undefined, version: string, packageId: string): Promise<ResolvedDeprecatedOperations | null> {
    const queryParams = new URLSearchParams()
    queryParams.append('includeDeprecatedItems', `${true}`)
    operations && operations.length && queryParams.append('ids', `${operations.join(',')}`)

    const encodedPackageKey = encodeURIComponent(packageId)
    const encodedVersionKey = encodeURIComponent(version)

    const deprecatedOperationsEndpoint = `${this.baseUrl}/api/v2/packages/${encodedPackageKey}/versions/${encodedVersionKey}/${apiType}/deprecated?${queryParams}`
    this.logger.debug('Fetch deprecated operations: ', deprecatedOperationsEndpoint)
    const logTag = '[getDeprecatedOperations]'

    return lastValueFrom(this.httpService
      .get(deprecatedOperationsEndpoint, { headers: this.headers })
      .pipe(
        retry({ delay: this.requestRetryHandler(logTag) }),
        map(({ data }) => data),
        catchError(err => {
          this.logger.error(logTag, err?.response?.data ?? err)
          return of(null)
        }),
      ),
    )
  }

  public async getVersionConfig(versionId: string, packageId: string, includeOperations = false): Promise<ResolvedVersion | null> {
    const encodedPackageKey = encodeURIComponent(packageId)
    const encodedVersionKey = encodeURIComponent(versionId)

    const versionConfigUrl = `${this.baseUrl}/api/v3/packages/${encodedPackageKey}/versions/${encodedVersionKey}?includeOperations=${includeOperations}`
    this.logger.debug('Fetch config: ', versionConfigUrl)
    const logTag = '[getVersionConfig]'

    return lastValueFrom(this.httpService
      .get(versionConfigUrl, { headers: this.headers })
      .pipe(
        retry({ delay: this.requestRetryHandler(logTag) }),
        map(({ data }) => data),
        catchError(err => {
          this.logger.error(logTag, err?.response?.data ?? err)
          return of(null)
        }),
      ),
    )
  }

  public async getPackage(packageId: string): Promise<ResolvedPackage | null> {
    const encodedPackageKey = encodeURIComponent(packageId)

    const packageUrl = `${this.baseUrl}/api/v2/packages/${encodedPackageKey}`
    this.logger.debug('Fetch package: ', packageUrl)
    const logTag = '[getPackage]'

    return lastValueFrom(this.httpService
      .get(packageUrl, { headers: this.headers })
      .pipe(
        retry({ delay: this.requestRetryHandler(logTag) }),
        map(({ data }) => data),
        catchError(err => {
          this.logger.error(logTag, err?.response?.data ?? err)
          return of(null)
        }),
      ),
    )
  }

  public async getGroupExportTemplate(
    packageId: string,
    versionId: string,
    apiType: string,
    groupName: string,
  ): Promise<string> {
    const encodedPackageKey = encodeURIComponent(packageId)
    const encodedVersionKey = encodeURIComponent(versionId)
    const encodedGroupName = encodeURIComponent(groupName)

    const templateUrl = `${this.baseUrl}/api/v1/packages/${encodedPackageKey}/versions/${encodedVersionKey}/${apiType}/groups/${encodedGroupName}/template`
    this.logger.debug('Fetch groups template: ', templateUrl)
    const logTag = '[getGroupExportTemplate]'

    return lastValueFrom(this.httpService
      .get(templateUrl, { headers: this.headers, responseType: 'arraybuffer' })
      .pipe(
        retry({ delay: this.requestRetryHandler(logTag) }),
        map((response) => Buffer.from(response.data).toString()),
        catchError(err => {
          if (err.response?.status !== 404) {
            this.logger.error(logTag, err?.response?.data ?? err)
          }
          return of('')
        }),
      ),
    )
  }

  public async getPublishedDocumentRaw(
    packageId: string,
    versionId: string,
    slug: string
  ): Promise<File | null> {
    const encodedPackageKey = encodeURIComponent(packageId)
    const encodedVersionKey = encodeURIComponent(versionId)
    const fileId = encodeURIComponent(slug)

    const templateUrl = `${this.baseUrl}/api/v2/packages/${encodedPackageKey}/versions/${encodedVersionKey}/files/${fileId}/raw`
    this.logger.debug('Fetch published document raw: ', templateUrl)
    const logTag = '[getPublishedDocumentRaw]'

    return lastValueFrom(this.httpService
      .get(templateUrl, { headers: this.headers, responseType: 'arraybuffer' })
      .pipe(
        retry({ delay: this.requestRetryHandler(logTag) }),
        map((response) => {
          const contentType = response.headers['content-type']
          const filename = response.headers['content-disposition'].split('filename=')[1].slice(1, -1)
          return new File([response.data], filename, { type: contentType })
        }),
        catchError(err => {
          this.logger.error(logTag, err?.response?.data ?? err)
          return of(null)
        }),
      ),
    )
  }

  private requestRetryHandler(logMessage: string): (error: any, retryCount: number) => ObservableInput<any> {
    return (error, retryCount) => {
      if (retryCount > RETRY_COUNT || NO_RETRY_STATUSES.includes(error?.response?.status)) {
        return throwError(() => error)
      }
      this.logger.debug(`${logMessage}`, `[RETRY] status: ${error?.response?.data?.status} attempt: ${retryCount}`)
      return timer(RETRY_DELAY)
    }
  }
}

const RETRY_DELAY = 2000
const RETRY_COUNT = 3
const NO_RETRY_STATUSES = [400, 404]
