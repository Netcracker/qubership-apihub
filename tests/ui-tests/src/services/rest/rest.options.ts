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

import type { Serializable } from 'playwright-core/types/structs'
import type { ReadStream } from 'fs'

export type PostOptions = {
  /**
   * Allows to set post data of the request. If the data parameter is an object, it will be serialized to json string
   * and `content-type` header will be set to `application/json` if not explicitly set. Otherwise, the `content-type`
   * header will be set to `application/octet-stream` if not explicitly set.
   */
  data?: string | Buffer | Serializable

  /**
   * Whether to throw on response codes other than 2xx and 3xx. By default, response object is returned for all status
   * codes.
   */
  failOnStatusCode?: boolean

  /**
   * Provides an object that will be serialized as html form using `application/x-www-form-urlencoded` encoding and sent
   * as this request body. If this parameter is specified `content-type` header will be set to
   * `application/x-www-form-urlencoded` unless explicitly provided.
   */
  form?: { [key: string]: string | number | boolean }

  /**
   * Allows to set HTTP headers. These headers will apply to the fetched request as well as any redirects initiated by
   * it.
   */
  headers?: { [key: string]: string }

  /**
   * Whether to ignore HTTPS errors when sending network requests. Defaults to `false`.
   */
  ignoreHTTPSErrors?: boolean

  /**
   * Maximum number of request redirects that will be followed automatically. An error will be thrown if the number is
   * exceeded. Defaults to `20`. Pass `0` to not follow redirects.
   */
  maxRedirects?: number

  /**
   * Provides an object that will be serialized as html form using `multipart/form-data` encoding and sent as this
   * request body. If this parameter is specified `content-type` header will be set to `multipart/form-data` unless
   * explicitly provided. File values can be passed either as
   * [`fs.ReadStream`](https://nodejs.org/api/fs.html#fs_class_fs_readstream) or as file-like object containing file
   * name, mime-type and its content.
   */
  multipart?: {
    [key: string]: string | number | boolean | ReadStream | {
      /**
       * File name
       */
      name: string

      /**
       * File type
       */
      mimeType: string

      /**
       * File content
       */
      buffer: Buffer
    }
  }

  /**
   * Query parameters to be sent with the URL.
   */
  params?: { [key: string]: string | number | boolean }

  /**
   * Request timeout in milliseconds. Defaults to `30000` (30 seconds). Pass `0` to disable timeout.
   */
  timeout?: number
}
