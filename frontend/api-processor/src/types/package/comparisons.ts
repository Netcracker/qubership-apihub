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

import { ChangeSummary, OperationId, OperationType, PackageId, VersionId } from '../external'
import { ActionType, DiffAction, DiffType } from '@netcracker/qubership-apihub-api-diff'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'

export interface PackageComparisons {
  comparisons: PackageComparison[]
}

export interface PackageComparison {
  comparisonFileId?: string
  packageId: PackageId
  version: VersionId
  revision?: number
  previousVersion: VersionId
  previousVersionPackageId: PackageId
  previousVersionRevision?: number
  fromCache: boolean
  operationTypes: OperationType[]
}

export interface PackageComparisonOperations {
  operations: PackageComparisonOperation[]
}

export interface PackageComparisonOperation {
  operationId: OperationId
  dataHash?: string
  previousDataHash?: string
  changeSummary?: ChangeSummary
  changes?: ChangeMessage[]
}

interface ChangeBase {
  severity: DiffType
  action: ActionType
  description?: string
  scope: string
}

type Hash = string

export interface ChangeAdd extends ChangeBase {
  action: typeof DiffAction.add
  currentDeclarationJsonPaths: JsonPath[]
  currentValueHash: Hash
}

export interface ChangeRemove extends ChangeBase {
  action: typeof DiffAction.remove
  previousDeclarationJsonPaths: JsonPath[]
  previousValueHash: Hash
}

export interface ChangeReplace extends ChangeBase {
  action: typeof DiffAction.replace
  previousDeclarationJsonPaths: JsonPath[]
  currentDeclarationJsonPaths: JsonPath[]
  currentValueHash: Hash
  previousValueHash: Hash
}

export interface ChangeRename extends ChangeBase {
  action: typeof DiffAction.rename
  previousDeclarationJsonPaths: JsonPath[]
  currentDeclarationJsonPaths: JsonPath[]
  currentKey: unknown
  previousKey: unknown
}

export type ChangeMessage = ChangeAdd | ChangeRemove | ChangeReplace | ChangeRename
