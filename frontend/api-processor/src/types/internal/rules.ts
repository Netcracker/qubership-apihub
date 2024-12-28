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

import { CrawlRules, JsonPath, SyncCrawlHook } from '@netcracker/qubership-apihub-json-crawl'
import { SearchScopes } from './operation'

//todo: change path type after deprecated items for graphql will be done
export type DeprecatedAnnotateFunc = (source: object, path: JsonPath) => string

export interface OperationCrawlState {
  scopes: SearchScopes    // search scopes
  parentRefs: string[]    // parent refs list
}

export interface SearchExampleCrawlState {
  hasExample: boolean
}

export interface RefCache {
  data: any
  refPath: string[]
  scopes: SearchScopes
}

export type OperationCrawlHook = SyncCrawlHook<OperationCrawlState, CrawlRule>

export type CrawlRule = {
  '#'?: Array<string>           // list of search scopes for value
  '##'?: Array<string>          // list of search scopes for key
  '!'?: DeprecatedAnnotateFunc  // deprecated description
}
export type OperationCrawlRules = CrawlRules<CrawlRule>

