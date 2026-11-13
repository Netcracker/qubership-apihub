import type { PackageKey, ServicePublishInfoKey } from './keys'
import type { ChangesSummary } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { DiffTypeDto } from '@netcracker/qubership-apihub-api-processor'
import { replacePropertyInChangesSummary } from '@netcracker/qubership-apihub-api-processor'

export type ServicePublishInfo = Readonly<{
  key: ServicePublishInfoKey
  apiTypes?: ApiType[]
  packageKey: PackageKey
  previousVersionPackageKey?: PackageKey
  changeSummary?: ChangesSummary
  viewChangesUrl?: string
  viewSnapshotUrl?: string
  viewBaselineUrl?: string
  baselineFound: boolean
  baselineVersionFound: boolean
  hasErrors: boolean
  changelogHasErrors: boolean
}>

export type ServicePublishInfoDto = Readonly<{
  id: ServicePublishInfoKey
  apiTypes?: ApiType[]
  packageId: PackageKey
  previousVersionPackageId?: PackageKey
  changes?: ChangesSummary<DiffTypeDto>
  viewChangesUrl?: string
  viewSnapshotUrl?: string
  viewBaselineUrl?: string
  baselineFound: boolean
  baselineVersionFound: boolean
  hasErrors?: boolean
  changelogHasErrors?: boolean
}>

export function toServicePublishInfo(value: ServicePublishInfoDto): ServicePublishInfo {
  return {
    key: value.id,
    apiTypes: value.apiTypes,
    packageKey: value.packageId,
    previousVersionPackageKey: value.previousVersionPackageId,
    changeSummary: value.changes && replacePropertyInChangesSummary(value.changes),
    viewChangesUrl: value.viewChangesUrl,
    viewSnapshotUrl: value.viewSnapshotUrl,
    viewBaselineUrl: value.viewBaselineUrl,
    baselineFound: value?.baselineFound ?? false,
    baselineVersionFound: value?.baselineVersionFound ?? false,
    hasErrors: value.hasErrors ?? false,
    changelogHasErrors: value.changelogHasErrors ?? false,
  }
}
