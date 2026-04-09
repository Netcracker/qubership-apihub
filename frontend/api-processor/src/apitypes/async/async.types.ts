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
import { v3 as AsyncAPIV3 } from '@asyncapi/parser/esm/spec-types'

export type AsyncScopeType = keyof typeof ASYNC_SCOPES
export type AsyncDocumentType = (typeof ASYNC_DOCUMENT_TYPE)[keyof typeof ASYNC_DOCUMENT_TYPE]
export type AsyncOperationActionType = 'send' | 'receive'

/**
 * AsyncAPI 3.0 operation metadata
 */
export interface AsyncOperationMeta {
  action: AsyncOperationActionType  // Operation action
  channel: string                   // Channel name
  protocol: string                  // Protocol (e.g., 'kafka', 'amqp', 'mqtt')
  customTags: CustomTags            // Custom x-* extensions
  messageId: string                 // Message key from the channel's messages map (e.g., 'UserSignedUp')
  asyncOperationId: string          // Operation key from the AsyncAPI operations map (e.g., 'sendUserSignedup')
}

/**
 * AsyncAPI document info
 */
export interface AsyncDocumentInfo {
  title: string
  description: string
  version: string
  info?: Partial<AsyncAPIV3.InfoObject>
  externalDocs?: Partial<AsyncAPIV3.ExternalDocumentationObject>
  tags: AsyncAPIV3.TagObject[]
}

/**
 * AsyncAPI operation data (single operation spec)
 */
export interface AsyncOperationData {
  asyncapi: string
  info: AsyncAPIV3.InfoObject
  channels?: AsyncAPIV3.ChannelsObject
  operations?: AsyncAPIV3.OperationsObject
  components?: AsyncAPIV3.ComponentsObject
  servers?: AsyncAPIV3.ServersObject
}

export type VersionAsyncDocument = VersionDocument<AsyncAPIV3.AsyncAPIObject>
export type VersionAsyncOperation = ApiOperation<AsyncOperationData, AsyncOperationMeta>

// TODO Delete AsyncRefCache if not used in future
export interface AsyncRefCache {
  scopes: Record<AsyncScopeType, string>
  refs: string[]
  data: any
}

// TODO Delete AsyncOperationContext if not used in future
export interface AsyncOperationContext {
  operationId: string
  scopes: Record<AsyncScopeType, string>
  operationData: AsyncOperationData
  document: VersionAsyncDocument
  refsCache: Record<string, AsyncRefCache>
  notifications: NotificationMessage[]
}
