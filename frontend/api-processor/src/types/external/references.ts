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
import { VersionStatus } from './config'

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

export type ResolvedReferenceMap = Record<string, ReferencedPackage>

export interface ReferencedPackage {
  refId: string
  kind: ReferencedPackageKind
  name: string
  version: string
  status: VersionStatus
  parentPackages?: string[]
  deletedAt?: string
  deletedBy?: string
  notLatestRevision?: string
}

export const KIND_PACKAGE = 'package'
export const KIND_DASHBOARD = 'dashboard'

export type ReferencedPackageKind =
  | typeof KIND_PACKAGE
  | typeof KIND_DASHBOARD
