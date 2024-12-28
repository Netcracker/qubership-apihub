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

import type { ComparisonObject } from '@apihub/routes/root/PortalPage/VersionPage/breadcrumbs'
import {
  COMPARISON_OBJECT_TYPE_DASHBOARD_REVISION,
  COMPARISON_OBJECT_TYPE_OPERATION_IN_DASHBOARD_REVISION,
  COMPARISON_OBJECT_TYPE_OPERATION_IN_PACKAGE_REVISION,
  COMPARISON_OBJECT_TYPE_OPERATIONS_GROUP_IN_PACKAGE_REVISION,
  COMPARISON_OBJECT_TYPE_PACKAGE_REVISION,
} from '@apihub/routes/root/PortalPage/VersionPage/breadcrumbs'
import { useVersionWithRevision } from '@apihub/routes/root/useVersionWithRevision'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Package, PackageKind } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { DASHBOARD_KIND, PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'

type UseComparisonObjectsOptions = Partial<{
  originPackage: Package | null
  originPackageKey: Key
  originVersionKey: VersionKey
  originOperationKey: Key
  changedPackage: Package | null
  changedPackageKey: Key
  changedVersionKey: VersionKey
  changedOperationKey: Key
  refId: string
  refVersion: string
  currentGroup: Key
  previousGroup: Key
}>

export function useComparisonObjects(
  {
    originPackage,
    originPackageKey,
    originVersionKey,
    originOperationKey,
    changedPackage,
    changedPackageKey,
    changedVersionKey,
    changedOperationKey,
    refId,
    refVersion,
    previousGroup,
    currentGroup,
  }: UseComparisonObjectsOptions,
): [ComparisonObject | null, ComparisonObject | null] {

  const { fullVersion: fullOriginVersion } = useVersionWithRevision(originVersionKey, originPackageKey)
  const { fullVersion: fullChangedVersion } = useVersionWithRevision(changedVersionKey, changedPackageKey)

  const {
    versionKey: originSplittedVersionKey,
    revisionKey: originRevisionKey,
  } = getSplittedVersionKey(fullOriginVersion)

  const {
    versionKey: changedSplittedVersionKey,
    revisionKey: changedRevisionKey,
  } = getSplittedVersionKey(fullChangedVersion)

  if (!originPackage || !changedPackage || !originPackageKey || !changedPackageKey || !originSplittedVersionKey || !changedSplittedVersionKey) {
    return [null, null]
  }

  return [
    getComparisonObject({
      kind: originPackage.kind,
      id: originPackageKey,
      version: originSplittedVersionKey,
      revision: originRevisionKey,
      operationId: originOperationKey,
      refVersion: refVersion,
      refId: refId,
      group: previousGroup,
    }),
    getComparisonObject({
      kind: changedPackage.kind,
      id: changedPackageKey,
      version: changedSplittedVersionKey,
      revision: changedRevisionKey,
      operationId: changedOperationKey,
      refVersion: refVersion,
      refId: refId,
      group: currentGroup,
    }),
  ]
}

export const getComparisonObject = (
  {
    kind,
    id,
    version,
    revision,
    refId,
    refVersion,
    operationId,
    group,
  }: {
    kind: PackageKind
    id: string
    version: string
    revision: string
    refId?: string
    refVersion?: string
    operationId?: string
    group?: Key
  },
): ComparisonObject => {
  const base = {
    id: id,
    version: version,
    revision: revision,
  }

  if (kind === PACKAGE_KIND && group) {
    return {
      ...base,
      group: group,
      type: COMPARISON_OBJECT_TYPE_OPERATIONS_GROUP_IN_PACKAGE_REVISION,
    }
  }

  if (kind === PACKAGE_KIND && operationId) {
    return {
      ...base,
      operationId: operationId,
      type: COMPARISON_OBJECT_TYPE_OPERATION_IN_PACKAGE_REVISION,
    }
  }

  if (kind === PACKAGE_KIND) {
    return {
      ...base,
      type: COMPARISON_OBJECT_TYPE_PACKAGE_REVISION,
    }
  }

  if (kind === DASHBOARD_KIND && refId && refVersion && operationId) {
    return {
      ...base,
      refId: refId,
      refVersion: refVersion,
      operationId: operationId,
      type: COMPARISON_OBJECT_TYPE_OPERATION_IN_DASHBOARD_REVISION,
    }
  }

  if (kind === DASHBOARD_KIND) {
    return {
      ...base,
      type: COMPARISON_OBJECT_TYPE_DASHBOARD_REVISION,
    }
  }

  throw new Error('Cannot construct ComparisonObject')
}
