import type { DiffType } from '@netcracker/qubership-apihub-api-diff'
import {
  DDL_KIND,
  type DdlKind,
  type DiffTypeDto,
  replacePropertyInChangesSummary,
} from '@netcracker/qubership-apihub-api-processor'

import { hasNoChangesInSummary } from '../utils/change-severities'
import { toOptionalTrimmedString, truncateDescription } from '../utils/strings'
import type { ChangesSummary } from './change-severities'
import { getContractListKey } from './contracts'
import { type PackageRef, type PackagesRefs, toPackageRef } from './operations'
import { EMPTY_CHANGE_SUMMARY } from './version-changelog'

export { type DdlKind, DDL_KIND }

export const DDL_ENTITY_KIND_TABLE = DDL_KIND.TABLE
// Backend/OpenAPI wire value; api-processor DDL_KIND.VIEW not shipped yet (v1 is table-only).
export const DDL_ENTITY_KIND_VIEW = 'view'

export type DdlEntityKind = DdlKind | typeof DDL_ENTITY_KIND_VIEW

export type DdlContractEntityDto = Readonly<{
  ddlEntityId: string
  kind: DdlEntityKind
  name: string
  schemaName: string
  description?: string
  documentId: string
  versionInternalDocumentId: string
  packageRef?: string
}>

export type DdlContractEntityDetailsDto =
  & DdlContractEntityDto
  & Readonly<{
    data?: string
  }>

export type DdlEntitiesDto = Readonly<{
  entities: ReadonlyArray<DdlContractEntityDto>
  packages?: PackagesRefs
}>

export type DdlContractEntity = Readonly<{
  ddlEntityId: string
  kind: DdlEntityKind
  name: string
  schemaName: string
  description?: string
  versionInternalDocumentId: string
  packageRef?: PackageRef
}>

export type DdlContractEntityDetails =
  & DdlContractEntity
  & Readonly<{
    data?: string
  }>

export type DdlContractsSummaryDto = Readonly<{
  tablesCount: number
  changesSummary?: ChangesSummary<DiffTypeDto>
  numberOfImpactedEntities?: ChangesSummary<DiffTypeDto>
}>

export type DdlContractsSummary = Readonly<{
  tablesCount: number
  changesSummary?: ChangesSummary<DiffType>
  numberOfImpactedEntities?: ChangesSummary<DiffType>
}>

export const DDL_TABLES_EMPTY_MESSAGE = 'No tables'

export function hasDdlContracts(ddl?: DdlContractsSummary): ddl is DdlContractsSummary {
  if (!ddl) {
    return false
  }
  return ddl.tablesCount > 0
}

export function toDdlContractsSummary(dto: DdlContractsSummaryDto | undefined): DdlContractsSummary | undefined {
  if (!dto || (dto.tablesCount ?? 0) <= 0) {
    return undefined
  }

  return {
    tablesCount: dto.tablesCount ?? 0,
    changesSummary: dto.changesSummary && replacePropertyInChangesSummary(dto.changesSummary),
    numberOfImpactedEntities: dto.numberOfImpactedEntities &&
      replacePropertyInChangesSummary(dto.numberOfImpactedEntities),
  }
}

export function toDdlContractEntity(
  dto: DdlContractEntityDto,
  packagesRefs?: PackagesRefs,
): DdlContractEntity {
  return {
    ddlEntityId: dto.ddlEntityId,
    kind: dto.kind,
    name: dto.name,
    schemaName: dto.schemaName,
    description: truncateDescription(dto.description),
    versionInternalDocumentId: dto.versionInternalDocumentId,
    packageRef: toPackageRef(dto.packageRef, packagesRefs),
  }
}

export function toDdlContractEntities(dto: DdlEntitiesDto): ReadonlyArray<DdlContractEntity> {
  return dto.entities?.map(entity => toDdlContractEntity(entity, dto.packages)) ?? []
}

export function getDdlTableListKey(table: Readonly<Pick<DdlContractEntity, 'ddlEntityId' | 'packageRef'>>): string {
  return getContractListKey(table.packageRef, table.ddlEntityId)
}

export function getDdlTableDisplayName(
  table: Readonly<Pick<DdlContractEntity, 'name' | 'ddlEntityId'>>,
): string {
  return table.name || table.ddlEntityId
}

export function getDdlTableDescription(
  table: Readonly<Pick<DdlContractEntity, 'description'>>,
): string | undefined {
  return toOptionalTrimmedString(table.description)
}

export type DdlComparisonSummaryDto = Readonly<{
  changesSummary?: ChangesSummary<DiffTypeDto>
  numberOfImpactedEntities?: ChangesSummary<DiffTypeDto>
}>

export type DdlComparisonSummary = Readonly<{
  changesSummary?: ChangesSummary<DiffType>
  numberOfImpactedEntities?: ChangesSummary<DiffType>
}>

export function toDdlComparisonSummary(
  dto: DdlComparisonSummaryDto | undefined,
): DdlComparisonSummary | undefined {
  if (!dto) {
    return undefined
  }

  return {
    changesSummary: dto.changesSummary && replacePropertyInChangesSummary(dto.changesSummary),
    numberOfImpactedEntities: dto.numberOfImpactedEntities &&
      replacePropertyInChangesSummary(dto.numberOfImpactedEntities),
  }
}

export function hasDdlComparisonChanges(ddl?: DdlComparisonSummary): boolean {
  if (!ddl) {
    return false
  }

  const changesSummary = ddl.changesSummary ?? EMPTY_CHANGE_SUMMARY
  const impactedSummary = ddl.numberOfImpactedEntities ?? EMPTY_CHANGE_SUMMARY
  return !hasNoChangesInSummary(changesSummary) || !hasNoChangesInSummary(impactedSummary)
}
