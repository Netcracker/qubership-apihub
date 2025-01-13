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

import type { GraphQlOperationType, OperationsApiType } from '@shared/entities'

export type OperationTest = Operation | GraphQlOperationTest

export type Operation = OperationMetadataTest & RestOperation

export type GraphQlOperationTest = OperationMetadataTest & GraphQlOperation

type OperationMetadataTest = {
  operationId: string
  title: string
  apiType: OperationsApiType
  apiKind: ApiKind
  tags?: string
  changes?: Partial<{
    breaking: {
      description: string
    }
    semiBreaking: {
      description: string
    }
    nonBreaking: {
      description: string
    }
    deprecated: {
      description: string
    }
    annotation: {
      description: string
    }
    unclassified: {
      description: string
    }
  }>
  deprecated?: {
    details?: string
    since?: string
  }
  deprecatedItem?: {
    description: string
    since: string
  }
  customMetadata?: string
  testJsonString?: string
  testYamlString?: string
  testExampleString?: string
}

export type RestOperation = {
  method: MethodType
  path: string
}

export type GraphQlOperation = {
  method: string
  type: GraphQlOperationType
}

export type MethodType = 'get' | 'post' | 'put' | 'patch' | 'delete'

export type ApiKind = 'all' | 'bwc' | 'no-bwc' | 'experimental'
