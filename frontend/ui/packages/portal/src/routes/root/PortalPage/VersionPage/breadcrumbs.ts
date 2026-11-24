import { getGroupPath, getOverviewPath, getWorkspacePath } from '../../../NavigationProvider'
import type { Path } from '@remix-run/router'
import type { Package, ParentPackage } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { DASHBOARD_KIND, GROUP_KIND, PACKAGE_KIND, WORKSPACE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { REVISION_DELIMITER } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { takeIf } from '@netcracker/qubership-apihub-ui-shared/utils/objects'
import type { OperationData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { getFullPrefixGroup } from '@portal/routes/root/PortalPage/VersionPage/useGroupComparisons'

export const COMPARISON_OBJECT_TYPE_DASHBOARD_REVISION = 'DASHBOARD_REVISION'
export const COMPARISON_OBJECT_TYPE_PACKAGE_REVISION = 'PACKAGE_REVISION'
export const COMPARISON_OBJECT_TYPE_OPERATION_IN_PACKAGE_REVISION = 'OPERATION_IN_PACKAGE_REVISION'
export const COMPARISON_OBJECT_TYPE_OPERATION_IN_DASHBOARD_REVISION = 'OPERATION_IN_DASHBOARD_REVISION'
export const COMPARISON_OBJECT_TYPE_OPERATIONS_GROUP_IN_PACKAGE_REVISION = 'OPERATIONS_GROUP_IN_PACKAGE_REVISION'

export type PackageRevision = {
  id: string
  version: string
  revision: string
  type: typeof COMPARISON_OBJECT_TYPE_PACKAGE_REVISION
}

export type DashboardRevision = {
  id: string
  version: string
  revision: string
  type: typeof COMPARISON_OBJECT_TYPE_DASHBOARD_REVISION
}

export type OperationInPackageRevision = {
  id: string
  version: string
  revision: string
  operationId: string
  type: typeof COMPARISON_OBJECT_TYPE_OPERATION_IN_PACKAGE_REVISION
}

export type OperationInDashboardRevision = {
  id: string
  version: string
  revision: string
  refId: string
  refVersion: string
  operationId: string
  type: typeof COMPARISON_OBJECT_TYPE_OPERATION_IN_DASHBOARD_REVISION
}

export type OperationsGroupInPackageRevision = {
  id: string
  version: string
  revision: string
  group: string
  type: typeof COMPARISON_OBJECT_TYPE_OPERATIONS_GROUP_IN_PACKAGE_REVISION
}

export type ComparisonObject =
  DashboardRevision
  | PackageRevision
  | OperationInPackageRevision
  | OperationInDashboardRevision
  | OperationsGroupInPackageRevision

export type ComparedBreadcrumbPathItem = {
  key: Key
  name: string
  to?: Partial<Path>
  description?: string
}

export type LinkedComparedBreadcrumbPathItem =
  ComparedBreadcrumbPathItem
  & Required<Pick<ComparedBreadcrumbPathItem, 'to'>>

export type ComparedPackagesBreadcrumbsData = {
  common: ComparedBreadcrumbPathItem[]
  origin: ComparedBreadcrumbPathItem[]
  changed: ComparedBreadcrumbPathItem[]
}

export function isLinkedComparedBreadcrumbPathItem(
  breadcrumb: ComparedBreadcrumbPathItem | null,
): breadcrumb is LinkedComparedBreadcrumbPathItem {
  return !!breadcrumb?.to
}

function getPackagePath(packageObject: Package | ParentPackage): Partial<Path> {
  switch (packageObject.kind) {
    case WORKSPACE_KIND:
      return getWorkspacePath({ workspaceKey: packageObject.key })
    case GROUP_KIND:
      return getGroupPath({ groupKey: packageObject.key })
    case PACKAGE_KIND:
    case DASHBOARD_KIND:
      return getOverviewPath({
        packageKey: packageObject.key,
        versionKey: 'defaultVersion' in packageObject && packageObject.defaultVersion || '',
      })
  }
}

export function getPackageBreadcrumb(packageObject: Package | ParentPackage): ComparedBreadcrumbPathItem {
  return {
    key: packageObject.key,
    name: packageObject.name,
    to: getPackagePath(packageObject),
  }
}

export function getVersionBreadcrumb(packageObject: Package, versionKey: string): ComparedBreadcrumbPathItem {
  return {
    key: versionKey,
    name: versionKey,
    to: getOverviewPath({
      packageKey: packageObject.key,
      versionKey: versionKey,
    }),
  }
}

export function getRevisionBreadcrumb(revision: string, isLatest: boolean): ComparedBreadcrumbPathItem {
  return {
    key: revision,
    name: `${REVISION_DELIMITER}${revision}`,
    ...takeIf({ description: '(latest)' }, isLatest),
  }
}

export function getOperationBreadcrumb(operation: OperationData): ComparedBreadcrumbPathItem {
  return {
    key: operation?.operationKey,
    name: operation?.title,
  }
}

export function getGroupBreadcrumb(group: Key, { restGroupingPrefix }: Package): ComparedBreadcrumbPathItem {
  const fullCurrentGroup = getFullPrefixGroup(restGroupingPrefix, group ?? '')
  return {
    key: `path prefix: ${fullCurrentGroup}`,
    name: `path prefix: ${fullCurrentGroup}`,
  }
}
