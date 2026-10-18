import type { DiffTypeDto } from '@netcracker/qubership-apihub-api-processor'
import { replacePropertyInChangesSummary } from '@netcracker/qubership-apihub-api-processor'

import type { ActionType, ChangesSummary } from './change-severities'
import { type DdlContractEntity, type DdlContractEntityDto, toDdlContractEntity } from './contracts-ddl'
import type { Key } from './keys'
import type { PackagesRefs } from './operations'
import { calculateAction } from './version-changelog'

export type DdlEntityChangeDto = DdlContractEntityDto
export type DdlEntityChange = DdlContractEntity

export type DdlEntityChangeEntryDto = Readonly<{
  ddlEntityData?: DdlEntityChangeDto
  previousDdlEntityData?: DdlEntityChangeDto
  changeSummary: ChangesSummary<DiffTypeDto>
  comparisonInternalDocumentId: string
}>

export type DdlEntityChangeEntry = Readonly<{
  ddlEntityData?: DdlEntityChange
  previousDdlEntityData?: DdlEntityChange
  changeSummary: ChangesSummary
  comparisonInternalDocumentId: Key
  action: ActionType
}>

export type DdlChangesPageDto = Readonly<{
  entities: ReadonlyArray<DdlEntityChangeEntryDto>
  previousVersion?: Key
  previousVersionPackageId?: Key
  packages?: PackagesRefs
}>

export type DdlChangesPage = Readonly<{
  entities: ReadonlyArray<DdlEntityChangeEntry>
  previousVersion?: Key
  previousVersionPackageKey?: Key
}>

export const EMPTY_DDL_CHANGES: DdlChangesPage = {
  entities: [],
}

export function toDdlEntityChangeEntry(
  dto: DdlEntityChangeEntryDto,
  packagesRefs?: PackagesRefs,
): DdlEntityChangeEntry {
  return {
    ddlEntityData: dto.ddlEntityData
      ? toDdlContractEntity(dto.ddlEntityData, packagesRefs)
      : undefined,
    previousDdlEntityData: dto.previousDdlEntityData
      ? toDdlContractEntity(dto.previousDdlEntityData, packagesRefs)
      : undefined,
    changeSummary: replacePropertyInChangesSummary(dto.changeSummary),
    comparisonInternalDocumentId: dto.comparisonInternalDocumentId,
    action: getDdlChangeAction({
      ddlEntityData: dto.ddlEntityData,
      previousDdlEntityData: dto.previousDdlEntityData,
    }),
  }
}

export function toDdlChangesPage(dto: DdlChangesPageDto): DdlChangesPage {
  return {
    previousVersion: dto.previousVersion,
    previousVersionPackageKey: dto.previousVersionPackageId,
    entities: dto.entities?.map(entry => toDdlEntityChangeEntry(entry, dto.packages)) ?? [],
  }
}

export function getDdlChangeAction(
  entry: Readonly<Pick<DdlEntityChangeEntryDto, 'ddlEntityData' | 'previousDdlEntityData'>>,
): ActionType {
  return calculateAction(
    entry.ddlEntityData?.ddlEntityId,
    entry.previousDdlEntityData?.ddlEntityId,
  )
}

export function getDdlChangeEntityId(entry: DdlEntityChangeEntry): Key {
  return entry.ddlEntityData?.ddlEntityId ?? entry.previousDdlEntityData!.ddlEntityId
}

export function findDdlChangeEntry(
  entries: ReadonlyArray<DdlEntityChangeEntry>,
  ddlEntityId: Key | undefined,
): DdlEntityChangeEntry | undefined {
  if (!ddlEntityId) {
    return undefined
  }
  return entries.find(entry =>
    entry.ddlEntityData?.ddlEntityId === ddlEntityId ||
    entry.previousDdlEntityData?.ddlEntityId === ddlEntityId,
  )
}

export type DdlCompareEntityIds = Readonly<{
  currentDdlEntityId: Key | undefined
  previousDdlEntityId: Key | undefined
}>

export function resolveDdlCompareEntityIds(entry: DdlEntityChangeEntry): DdlCompareEntityIds {
  return {
    currentDdlEntityId: entry.ddlEntityData?.ddlEntityId,
    previousDdlEntityId: entry.previousDdlEntityData?.ddlEntityId,
  }
}

export function getDdlEntityChangesRequestIds(entry: DdlEntityChangeEntry): Readonly<{
  ddlEntityId: Key
  previousVersionDdlEntityId: Key | undefined
}> {
  const currentDdlEntityId = entry.ddlEntityData?.ddlEntityId
  const previousDdlEntityId = entry.previousDdlEntityData?.ddlEntityId
  return {
    ddlEntityId: currentDdlEntityId ?? previousDdlEntityId!,
    previousVersionDdlEntityId: currentDdlEntityId ? previousDdlEntityId : undefined,
  }
}
