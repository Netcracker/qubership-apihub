/*
 * Browser tab titles of the comparison pages: how the compared versions, groups and operations
 * resolve into title strings. The composition with the segments of the other pages is in
 * `pageTitles.ts`; the wording is in `pageTitleLabels.ts`.
 */

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { REVISION_DELIMITER } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import type { DocumentTitleSegments } from '@netcracker/qubership-apihub-ui-shared/utils/document-title'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'

import { COMPARISON_ARROW, PAGE_TITLE_LABELS } from './pageTitleLabels'

/** A version as the title shows it: the revision is shown only when it is not the latest one, as in the toolbar. */
export type TitleVersion = Partial<{
  fullVersion: Key
  latestRevision: boolean
}>

type ComparisonSide = Partial<{
  packageName: string
  version: TitleVersion
}>

export type VersionsComparisonTitleParams = Partial<{
  origin: ComparisonSide
  changed: ComparisonSide
}>

type OperationsComparisonTitleParams = VersionsComparisonTitleParams & Partial<{
  originOperationTitle: string
  changedOperationTitle: string
}>

type GroupsComparisonTitleParams = Partial<{
  originGroup: string
  changedGroup: string
  changed: ComparisonSide
}>

type GroupOperationsComparisonTitleParams = GroupsComparisonTitleParams & Partial<{
  originOperationTitle: string
  changedOperationTitle: string
}>

export const COMPARISON_PAGE_TITLES = {
  versionsComparison: versionsComparisonTitle,
  operationsComparison: (params: OperationsComparisonTitleParams): DocumentTitleSegments => [
    fromTo(params.originOperationTitle, params.changedOperationTitle) ?? PAGE_TITLE_LABELS.operation,
    ...versionsComparisonTitle(params),
  ],
  groupsComparison: (params: GroupsComparisonTitleParams): DocumentTitleSegments => [
    groupsComparisonTitle(params),
    params.changed?.packageName,
    toTitleVersion(params.changed?.version),
  ],
  groupOperationsComparison: (params: GroupOperationsComparisonTitleParams): DocumentTitleSegments => [
    fromTo(params.originOperationTitle, params.changedOperationTitle) ?? PAGE_TITLE_LABELS.operation,
    groupsComparisonTitle(params),
    params.changed?.packageName,
    toTitleVersion(params.changed?.version),
  ],
}

export function toTitleVersion(version: TitleVersion | undefined): string | undefined {
  if (!version?.fullVersion) {
    return undefined
  }
  const { versionKey, revisionKey } = getSplittedVersionKey(version.fullVersion)
  const isLatestRevision = version.latestRevision ?? true
  return isLatestRevision || !revisionKey ? versionKey : `${versionKey}${REVISION_DELIMITER}${revisionKey}`
}

function groupsComparisonTitle({ originGroup, changedGroup }: GroupsComparisonTitleParams): string {
  const groups = fromTo(originGroup, changedGroup)
  return groups ? `${PAGE_TITLE_LABELS.compareGroups} ${groups}` : PAGE_TITLE_LABELS.compareGroups
}

function versionsComparisonTitle(params: VersionsComparisonTitleParams): DocumentTitleSegments {
  return [
    comparisonTitle(PAGE_TITLE_LABELS.compare, params),
    isSamePackage(params) ? params.changed?.packageName ?? params.origin?.packageName : undefined,
  ]
}

function comparisonTitle(label: string, params: VersionsComparisonTitleParams): string {
  const withPackage = !isSamePackage(params)
  const sides = fromTo(
    toComparisonSideTitle(params.origin, withPackage),
    toComparisonSideTitle(params.changed, withPackage),
  )
  return sides && (withPackage || sides.includes(COMPARISON_ARROW)) ? `${label} ${sides}` : label
}

function toComparisonSideTitle(side: ComparisonSide | undefined, withPackage: boolean): string | undefined {
  const version = toTitleVersion(side?.version)
  return withPackage
    ? [side?.packageName, version].filter(Boolean).join(' ') || undefined
    : version
}

function isSamePackage({ origin, changed }: VersionsComparisonTitleParams): boolean {
  return !origin?.packageName || !changed?.packageName || origin.packageName === changed.packageName
}

function fromTo(origin: string | undefined, changed: string | undefined): string | undefined {
  if (origin && changed && origin !== changed) {
    return `${origin}${COMPARISON_ARROW}${changed}`
  }
  return changed ?? origin
}
