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
import { ResolvedVersionDocument, ZippableDocument } from '../../types'
import { NORMALIZE_OPTIONS, ORIGINS_SYMBOL } from '../../consts'

export const GRAPHQL_API_TYPE = 'graphql' as const

export const GRAPHQL_DOCUMENT_TYPE = {
  SCHEMA: 'graphql-schema',
  GRAPHAPI: 'graphapi',
  INTROSPECTION: 'introspection',
} as const

export const GRAPHQL_FILE_FORMAT = {
  YAML: 'yaml',
  JSON: 'json',
  GRAPHQL: 'graphql',
  GQL: 'gql',
} as const

export const GRAPHQL_TYPE_KEYS = ['queries', 'mutations', 'subscriptions'] as const

export const GRAPHQL_SCOPES = {
  all: 'all',
  argument: 'argument',
  property: 'property',
  annotation: 'annotation',
} as const

export const GRAPHQL_TYPE = {
  'queries': 'query',
  'mutations': 'mutation',
  'subscriptions': 'subscription',
} as const

export function isGraphqlDocument(document: ZippableDocument | ResolvedVersionDocument): boolean {
  return Object.values(GRAPHQL_DOCUMENT_TYPE).some(type => document.type === type)
}

export const GRAPHQL_EFFECTIVE_NORMALIZE_OPTIONS = {
  ...NORMALIZE_OPTIONS,
  originsFlag: ORIGINS_SYMBOL,
}
