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

import { ChainItem, HasSelfMetaResolver, Jso, JSON_SCHEMA_PROPERTY_ALL_OF, JSON_SCHEMA_PROPERTY_ANY_OF, JSON_SCHEMA_PROPERTY_ONE_OF, OpenApiHttpMethod, OriginLeafs } from '@netcracker/qubership-apihub-api-unifier'
import { CrawlRules, SyncCrawlHook } from '@netcracker/qubership-apihub-json-crawl'
import { OpenAPIV3 } from 'openapi-types'

export interface VisitorCrawlRule {
  createContext?: (
    key: PropertyKey,
    value: Jso,
    declarationPaths: ChainItem[],
    alreadyVisited: boolean
  ) => VisitorCallbackArgument<unknown, unknown>
  visitorMethodBase?: string
  passthrough?:boolean
}

export interface VisitorCrawlState extends HasSelfMetaResolver<'selfOriginsResolver', OriginLeafs> {
  visitor: OpenApiPathVisitor
  internalOptions: InternalVisitorOptions
  visitedObjects: Set<unknown>
}

export type VisitorCrawlHook = SyncCrawlHook<VisitorCrawlState, VisitorCrawlRule>

export type VisitorCrawlRules = CrawlRules<VisitorCrawlRule>

export type VisitorCallbackArgument<T, R> = {
  value: T
  declarationPaths: ChainItem[]
  valueAlreadyVisited: boolean
} & R
export type VisitorCallbackStartFn<T, R> = (value: VisitorCallbackArgument<T, R>) => boolean
export type VisitorCallbackEndFn<T, R> = (value: VisitorCallbackArgument<T, R>) => void

export interface VisitorOptions {
  originsFlag?: symbol
}

export type CombinerType =
  typeof JSON_SCHEMA_PROPERTY_ANY_OF
  | typeof JSON_SCHEMA_PROPERTY_ONE_OF
  | typeof JSON_SCHEMA_PROPERTY_ALL_OF

export type OpenApiPathVisitor = Partial<{
  pathStart: (value: VisitorCallbackArgument<OpenAPIV3.PathItemObject, { path: string }>) => boolean
  pathEnd: (value: VisitorCallbackArgument<OpenAPIV3.PathItemObject, { path: string }>) => void

  httpMethodStart: (value: VisitorCallbackArgument<OpenAPIV3.OperationObject, { method: OpenApiHttpMethod }>) => boolean
  httpMethodEnd: (value: VisitorCallbackArgument<OpenAPIV3.OperationObject, { method: OpenApiHttpMethod }>) => void

  parameterStart: (value: VisitorCallbackArgument<OpenAPIV3.ParameterObject, unknown>) => boolean
  parameterEnd: (value: VisitorCallbackArgument<OpenAPIV3.ParameterObject, unknown>) => void

  requestBodyStart: (value: VisitorCallbackArgument<OpenAPIV3.RequestBodyObject, unknown>) => boolean
  requestBodyEnd: (value: VisitorCallbackArgument<OpenAPIV3.RequestBodyObject, unknown>) => void

  responseStart: (value: VisitorCallbackArgument<OpenAPIV3.ResponseObject, { responseCode: string }>) => boolean
  responseEnd: (value: VisitorCallbackArgument<OpenAPIV3.ResponseObject, { responseCode: string }>) => void

  mediaTypeStart: (value: VisitorCallbackArgument<OpenAPIV3.MediaTypeObject, { mediaType: string }>) => boolean
  mediaTypeEnd: (value: VisitorCallbackArgument<OpenAPIV3.MediaTypeObject, { mediaType: string }>) => void

  schemaRootStart: (value: VisitorCallbackArgument<OpenAPIV3.SchemaObject, unknown>) => boolean
  schemaRootEnd: (value: VisitorCallbackArgument<OpenAPIV3.SchemaObject, unknown>) => void

  schemaPropertyStart: (value: VisitorCallbackArgument<OpenAPIV3.SchemaObject, { propertyName: string }>) => boolean
  schemaPropertyEnd: (value: VisitorCallbackArgument<OpenAPIV3.SchemaObject, { propertyName: string }>) => void

  schemaItemsStart: (value: VisitorCallbackArgument<OpenAPIV3.SchemaObject, unknown>) => boolean
  schemaItemsEnd: (value: VisitorCallbackArgument<OpenAPIV3.SchemaObject, unknown>) => void

  combinerStart: (value: VisitorCallbackArgument<OpenAPIV3.SchemaObject[], { combinerType: CombinerType }>) => boolean
  combinerEnd: (value: VisitorCallbackArgument<OpenAPIV3.SchemaObject[], { combinerType: CombinerType }>) => void

  combinerItemStart: (value: VisitorCallbackArgument<OpenAPIV3.SchemaObject, { combinerItemIndex: number }>) => boolean
  combinerItemEnd: (value: VisitorCallbackArgument<OpenAPIV3.SchemaObject, { combinerItemIndex: number }>) => void

  headerStart: (value: VisitorCallbackArgument<OpenAPIV3.HeaderObject, { header: string }>) => boolean
  headerEnd: (value: VisitorCallbackArgument<OpenAPIV3.HeaderObject, { header: string }>) => void
}>

export interface InternalVisitorOptions extends Omit<VisitorOptions, 'originsFlag'> {
  originsFlag: symbol
}
export const DEFAULT_OPTION_ORIGINS_META_KEY = Symbol('$origins')

export const PROPERTY_ALIAS_ADDITIONAL_PROPERTIES = '*'

export interface WalkContext {
  internalOptions: InternalVisitorOptions
  effectivePath: ChainItem
  declarationPaths: ChainItem[]
  visitedObjects: Set<unknown>
}
