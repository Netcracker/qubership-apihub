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

import { BuildConfig } from '@netcracker/qubership-apihub-api-processor'
import { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { Observable } from 'rxjs'

import { loadConfig, loadFile } from './utils'

export interface BuildStatusRequest {
  packageId: string
  buildId: string
  headers: any
  data: any
}

export class MockHttpService {
  public requests: BuildStatusRequest[] = []
  private resolver?: (config: BuildStatusRequest) => void

  public clear(): MockHttpService {
    this.requests.length = 0
    return this
  }

  public async buildStatus(): Promise<BuildStatusRequest> {
    return new Promise((resolve) => {
      if (this.requests.length) {
        return resolve(this.requests.pop())
      }
      this.resolver = resolve
    })
  }

  public async postBuildStatus(config: AxiosRequestConfig, packageId: string, buildId: string) {
    if (!this.requests.length && this.resolver) {
      this.resolver({packageId, buildId, data: config.data, headers: config.headers})
    } else {
      this.requests.push({packageId, buildId, data: config.data, headers: config.headers})
    }
  }

  public async getVersionFile(config: AxiosRequestConfig, packageId: string, version: string, slug: string) {
    return loadFile('test/resources/versions', packageId + '#' + version, slug)
  }

  public async getVersionConfig(config: AxiosRequestConfig, packageId: string, version: string): Promise<BuildConfig> {
    return loadConfig('test/resources/versions', packageId + '#' + version)
  }

  public async buildTasks(config: AxiosRequestConfig, packageId: string, buildId: string) {
    return null
  }

  private async getResponse(config: AxiosRequestConfig): Promise<AxiosResponse<any>> {
    const paths = [
      {
        method: 'GET',
        mask: '(?:\\S*)/projects/(\\S*)/versions/(\\S*)/files/(\\S*)/raw',
        handler: this.getVersionFile,
      },
      { method: 'GET', mask: '(?:\\S*)/projects/(\\S*)/versions/(\\S*)', handler: this.getVersionConfig },
      { method: 'POST', mask: '(?:\\S*)/packages/(\\S*)/publish/(\\S*)/status', handler: this.postBuildStatus },
      { method: 'POST', mask: '(?:\\S*)/builders/(\\S*)/tasks', handler: this.buildTasks },
    ]

    const path = paths.find(({method, mask}) => method === config.method && new RegExp(mask).test(config.url))

    const args: any[] = config.url.match(path.mask)
    const data = await path.handler.call(this, config, ...args.slice(1))

    return {data, status: 200, statusText: 'OK', headers: {}, config: config as InternalAxiosRequestConfig}
  }

  public request<T = any>(config: AxiosRequestConfig): Observable<AxiosResponse<T>> {
    return new Observable(subscriber => {
      this.getResponse(config).then(response => {
        subscriber.next(response)
        subscriber.complete()
      })
      return () => {}
    })
  }

  get<T = any>(url: string, config?: AxiosRequestConfig): Observable<AxiosResponse<T>> {
    return this.request({ ...config, url, method: "GET" })
  }

  delete<T = any>(url: string, config?: AxiosRequestConfig): Observable<AxiosResponse<T>>{
    return this.request({ ...config, url, method: "DELETE" })
  }

  head<T = any>(url: string, config?: AxiosRequestConfig): Observable<AxiosResponse<T>>{
    return this.request({ ...config, url, method: "HEAD" })
  }

  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Observable<AxiosResponse<T>>{
    return this.request({ ...config, url, method: "POST", data })
  }

  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Observable<AxiosResponse<T>>{
    return this.request({ ...config, url, method: "PUT", data })
  }

  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Observable<AxiosResponse<T>>{
    return this.request({ ...config, url, method: "PATCH", data })
  }
}
