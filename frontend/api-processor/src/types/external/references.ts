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

import { PackageId, VersionId } from './types'

export type VersionReferencesResolver = (
  version: VersionId,
  packageId: PackageId,
) => Promise<ResolvedReferences | null>

export type ReferenceElement = {
  packageRef: string // packageId@version
  parentPackageRef?: string // packageId@version
  excluded?: boolean
}

export interface ResolvedReferences {
  references: ReferenceElement[]
  packages: ResolvedReferenceMap
}

export type ResolvedReferenceMap = Record<string, ResolvedReference>

export interface ResolvedReference {
  refId: string
  version: string
  versionRevision: number
  parentRefId?: string
  parentRefVersion?: string
  excluded?: boolean
  deletedAt?: string

  // other params
  // [key: string]: unknown

  // name: string
  // status: 'draft' | 'release' | 'release candidate' | 'deprecated' | 'archived'
  // kind?: 'package' | 'dashboard'
  // parents?: unknown[]
}
