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

import type { OpenAPIV3 } from 'openapi-types'

import { ApiOperation, VersionDocument } from '../../types'
import { ASYNC_DOCUMENT_TYPE, ASYNC_SCOPES } from './async.consts'

export type AsyncScopeType = keyof typeof ASYNC_SCOPES
export type AsyncDocumentType = (typeof ASYNC_DOCUMENT_TYPE)[keyof typeof ASYNC_DOCUMENT_TYPE]

export interface AsyncOperationMeta {
  path: string // /packages/*/version/*
  method: OpenAPIV3.HttpMethods // get | post
  tags?: string[]
}

export interface AsyncDocumentInfo {
  title: string
  description: string
  version: string
}

export type VersionAsyncDocument = VersionDocument<any>
export type VersionAsyncOperation = ApiOperation<AsyncOperationData, AsyncOperationMeta>

export type AsyncOperationData = any

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
}

export interface BuildAsyncOperationDataResult {
  data: OpenAPIV3.OperationObject
  scopes: Record<AsyncScopeType, string>
  refs: Record<string, AsyncScopeType[]>
  tags: string[]
}
