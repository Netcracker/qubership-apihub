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

import { ApiOperation, NotificationMessage, VersionDocument } from '../../types'
import { ASYNC_DOCUMENT_TYPE, ASYNC_SCOPES } from './async.consts'
import { CustomTags } from '../../utils/apihubSpecificationExtensions'

export type AsyncScopeType = keyof typeof ASYNC_SCOPES
export type AsyncDocumentType = (typeof ASYNC_DOCUMENT_TYPE)[keyof typeof ASYNC_DOCUMENT_TYPE]

/**
 * AsyncAPI 3.0 operation metadata
 */
export interface AsyncOperationMeta {
  action: 'send' | 'receive'        // Operation action //TODO add typing
  channel: string                   // Channel name
  protocol: string                  // Protocol (e.g., 'kafka', 'amqp', 'mqtt')
  customTags: CustomTags            // Custom x-* extensions
}

/**
 * AsyncAPI document info
 */
export interface AsyncDocumentInfo {
  title: string
  description: string
  version: string
}

//TODO: fix type (better yet use AsyncApiDocument type from @asyncapi/parser)
/**
 * AsyncAPI 3.0 document structure (plain JSON object)
 */
export interface AsyncApiDocument {
  asyncapi: string                  // Version (e.g., '3.0.0')
  info: {
    title: string
    version: string
    description?: string
    [key: string]: any
  }
  channels?: Record<string, any>    // Channels definition
  operations?: Record<string, any>  // Operations definition
  components?: Record<string, any>  // Reusable components
  servers?: Record<string, any>     // Server definitions
  [key: string]: any
}

/**
 * AsyncAPI operation data (single operation spec)
 */
export interface AsyncOperationData {
  asyncapi: string
  info: AsyncApiDocument['info']
  channels?: Record<string, any>
  operations?: Record<string, any>
  components?: Record<string, any>
  servers?: Record<string, any>
}

export type VersionAsyncDocument = VersionDocument<AsyncApiDocument>
export type VersionAsyncOperation = ApiOperation<AsyncOperationData, AsyncOperationMeta>

export interface AsyncRefCache {
  scopes: Record<AsyncScopeType, string>
  refs: string[]
  data: any
}

export interface AsyncOperationContext {
  operationId: string
  scopes: Record<AsyncScopeType, string>
  operationData: AsyncOperationData
  document: VersionAsyncDocument
  refsCache: Record<string, AsyncRefCache>
  notifications: NotificationMessage[]
}
