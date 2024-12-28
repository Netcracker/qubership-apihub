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

import { useVersionWithRevision } from '../../useVersionWithRevision'
import { REVISION_DELIMITER } from '@apihub/entities/versions'
import { usePackage } from '@apihub/routes/root/usePackage'
import type {
  ComparedBreadcrumbPathItem,
  ComparedPackagesBreadcrumbsData,
  ComparisonObject,
  OperationInPackageRevision,
  OperationsGroupInPackageRevision,
} from './breadcrumbs'
import {
  COMPARISON_OBJECT_TYPE_OPERATION_IN_DASHBOARD_REVISION,
  COMPARISON_OBJECT_TYPE_OPERATION_IN_PACKAGE_REVISION,
  COMPARISON_OBJECT_TYPE_OPERATIONS_GROUP_IN_PACKAGE_REVISION,
  getGroupBreadcrumb,
  getOperationBreadcrumb,
  getPackageBreadcrumb,
  getRevisionBreadcrumb,
  getVersionBreadcrumb,
} from './breadcrumbs'
import type { OperationOptions } from '@apihub/routes/root/PortalPage/VersionPage/useOperation'
import { useOperation } from '@apihub/routes/root/PortalPage/VersionPage/useOperation'
import type { OperationsApiType } from '@netcracker/qubership-apihub-api-processor'
import { useParams } from 'react-router-dom'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

export function getVersionWithRevisionOptions(obj?: ComparisonObject | null, enabled?: boolean): [Key | undefined, Key | undefined, boolean | undefined] {
  return [
    `${obj?.version}${REVISION_DELIMITER}${obj?.revision}`,
    obj?.id,
    enabled,
  ]
}

export function getOperationOptions(obj?: ComparisonObject | null, apiType?: OperationsApiType, enabled?: boolean): OperationOptions {
  if (obj?.type === COMPARISON_OBJECT_TYPE_OPERATION_IN_PACKAGE_REVISION) {
    return {
      packageKey: obj.id,
      versionKey: obj.version,
      operationKey: obj.operationId,
      apiType: apiType,
      enabled: enabled,
    }
  }
  if (obj?.type === COMPARISON_OBJECT_TYPE_OPERATION_IN_DASHBOARD_REVISION) {
    return {
      packageKey: obj.refId,
      versionKey: obj?.refVersion,
      operationKey: obj?.operationId,
      apiType: apiType,
      enabled: enabled,
    }
  }
  return {
    enabled: false,
  }
}

function isOperationComparisonObject(
  object: ComparisonObject | null,
): object is OperationInPackageRevision {
  return object?.type === COMPARISON_OBJECT_TYPE_OPERATION_IN_PACKAGE_REVISION || object?.type === COMPARISON_OBJECT_TYPE_OPERATION_IN_DASHBOARD_REVISION
}

function isOperationsGroupComparisonObject(
  object: ComparisonObject | null,
): object is OperationsGroupInPackageRevision {
  return object?.type === COMPARISON_OBJECT_TYPE_OPERATIONS_GROUP_IN_PACKAGE_REVISION
}

export function useCompareBreadcrumbs(
  obj1: ComparisonObject | null,
  obj2: ComparisonObject | null,
): ComparedPackagesBreadcrumbsData | null {
  const { apiType } = useParams<{ apiType: OperationsApiType }>()

  if (obj1?.type !== obj2?.type) {
    throw new Error('Cannot compare different objects')
  }

  const isRevisionCompare = !!obj1?.revision && obj1?.version === obj2?.version && obj1?.revision !== obj2?.revision
  const isOperationsCompare = isOperationComparisonObject(obj1) && isOperationComparisonObject(obj2)
  const areOperationsDifferent = isOperationsCompare && obj1?.operationId !== obj2?.operationId
  const isOperationsGroupCompare = isOperationsGroupComparisonObject(obj1) && isOperationsGroupComparisonObject(obj2)

  const [originPackageOrDashboard] = usePackage({ packageKey: obj1?.id, showParents: true })
  const [changedPackageOrDashboard] = usePackage({ packageKey: obj2?.id, showParents: true })

  const { latestRevision: originIsLatestRevision } = useVersionWithRevision(...getVersionWithRevisionOptions(obj1, isRevisionCompare))
  const { latestRevision: changedIsLatestRevision } = useVersionWithRevision(...getVersionWithRevisionOptions(obj2, isRevisionCompare))

  const { data: originOperation } = useOperation(getOperationOptions(obj1, apiType, areOperationsDifferent))
  const { data: changedOperation } = useOperation(getOperationOptions(obj2, apiType, areOperationsDifferent))

  if (!obj1 || !obj2 || !originPackageOrDashboard || !changedPackageOrDashboard) {
    return null
  }

  const originBreadcrumbs = originPackageOrDashboard?.parents?.map(getPackageBreadcrumb) ?? []
  const changedBreadcrumbs = changedPackageOrDashboard?.parents?.map(getPackageBreadcrumb) ?? []

  originBreadcrumbs.push(getPackageBreadcrumb(originPackageOrDashboard))
  changedBreadcrumbs.push(getPackageBreadcrumb(changedPackageOrDashboard))

  originBreadcrumbs.push(getVersionBreadcrumb(originPackageOrDashboard, obj1.version))
  changedBreadcrumbs.push(getVersionBreadcrumb(changedPackageOrDashboard, obj2.version))

  if (isRevisionCompare) {
    originBreadcrumbs.push(getRevisionBreadcrumb(obj1.revision, originIsLatestRevision))
    changedBreadcrumbs.push(getRevisionBreadcrumb(obj2.revision, changedIsLatestRevision))
  }

  if (originOperation && changedOperation) {
    originBreadcrumbs.push(getOperationBreadcrumb(originOperation))
    changedBreadcrumbs.push(getOperationBreadcrumb(changedOperation))
  }

  if (isOperationsGroupCompare) {
    originBreadcrumbs.push(getGroupBreadcrumb(obj1.group, originPackageOrDashboard))
    changedBreadcrumbs.push(getGroupBreadcrumb(obj2.group, changedPackageOrDashboard))
  }

  return splitBreadcrumbs(originBreadcrumbs, changedBreadcrumbs)
}

function splitBreadcrumbs(
  originBreadcrumbs: ComparedBreadcrumbPathItem[],
  changedBreadcrumbs: ComparedBreadcrumbPathItem[],
): ComparedPackagesBreadcrumbsData {
  const breadcrumbsData: ComparedPackagesBreadcrumbsData = {
    common: [],
    origin: [],
    changed: [],
  }

  for (let i = 0; i < (Math.max(originBreadcrumbs.length, changedBreadcrumbs.length)); i++) {
    if (originBreadcrumbs[i]?.key === changedBreadcrumbs[i]?.key) {
      breadcrumbsData.common.push(originBreadcrumbs[i])
    } else {
      originBreadcrumbs[i] && breadcrumbsData.origin.push(originBreadcrumbs[i])
      changedBreadcrumbs[i] && breadcrumbsData.changed.push(changedBreadcrumbs[i])
    }
  }

  return breadcrumbsData
}
