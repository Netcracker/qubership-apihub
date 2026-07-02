import type { DiffType } from '@netcracker/qubership-apihub-api-diff'
import { type DiffTypeDto, replacePropertyInChangesSummary } from '@netcracker/qubership-apihub-api-processor'

import { hasNoChangesInSummary } from '../utils/change-severities'
import type { ChangesSummary } from './change-severities'
import { EMPTY_CHANGE_SUMMARY } from './version-changelog'

// TODO(DDL/api-processor): import DDL_ENTITY_KIND_* from api-processor when the DDL plugin ships.
// 'view' is reserved for forward compatibility; v1 emits tables only.
export const DDL_ENTITY_KIND_TABLE = 'table'
export const DDL_ENTITY_KIND_VIEW = 'view'

export type DdlEntityKind = typeof DDL_ENTITY_KIND_TABLE | typeof DDL_ENTITY_KIND_VIEW

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

export type DdlContractEntity = DdlContractEntityDto

export type DdlContractEntityDetails = DdlContractEntityDetailsDto

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

export function toDdlContractEntity(dto: DdlContractEntityDto): DdlContractEntity {
  return dto
}

export function getDdlTableDisplayName(
  table: Readonly<Pick<DdlContractEntity, 'name' | 'ddlEntityId'>>,
): string {
  return table.name || table.ddlEntityId
}

export function getDdlTableSchemaName(
  table: Readonly<Pick<DdlContractEntity, 'schemaName'>>,
): string | undefined {
  return table.schemaName
}

export function getDdlTableDescription(
  table: Readonly<Pick<DdlContractEntity, 'description'>>,
): string | undefined {
  const { description } = table
  if (typeof description !== 'string') {
    return undefined
  }
  const trimmed = description.trim()
  return trimmed === '' ? undefined : trimmed
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
