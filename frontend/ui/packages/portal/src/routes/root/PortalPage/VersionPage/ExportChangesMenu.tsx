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

import type { FC } from 'react'
import { memo } from 'react'
import { useParams } from 'react-router-dom'
import { useDownloadChangesAsExcel } from './useDownloadChangesAsExcel'
import { useOrderedComparisonFiltersSummary } from './useOrderedComparisonFiltersSummary'
import type { ChangeSeverity } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import type { ApiAudience, ApiKind } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import {
  useResolvedOperationGroupParameters,
} from '@netcracker/qubership-apihub-ui-shared/hooks/operation-groups/useResolvedOperationGroupParameters'
import { ExportMenuButton } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ExportMenuButton'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export type ExportChangesMenuProps = {
  textFilter?: string
  kind?: ApiKind
  apiAudience?: ApiAudience
  tag?: string
  severityFilter?: ChangeSeverity[]
  severityChanges: ReadonlySet<ChangeSeverity>
  refPackageId?: string
  emptyTag?: boolean
  title?: string
  group?: string
  previousVersion?: string
  previousVersionPackageId?: string
}

export const ExportChangesMenu: FC<ExportChangesMenuProps> = memo(({
  textFilter,
  kind,
  apiAudience,
  tag,
  severityFilter,
  refPackageId,
  emptyTag,
  severityChanges,
  group,
  previousVersion,
  previousVersionPackageId,
}) => {
  const { packageId, versionId, apiType = DEFAULT_API_TYPE } = useParams<{
    packageId: string
    versionId: string
    apiType: ApiType
  }>()

  const { resolvedGroupName, resolvedEmptyGroup } = useResolvedOperationGroupParameters(group)

  const [downloadChangesAsExcel] = useDownloadChangesAsExcel()

  const changesSummaryFromContext = useOrderedComparisonFiltersSummary({ apiType })
  const isDownloadButtonDisabled = isEmptyChangesSummary(severityChanges, changesSummaryFromContext)

  const onDownloadAllChanges = (): void => {
    downloadChangesAsExcel({
      packageKey: packageId!,
      version: versionId!,
      apiType: apiType!,
    })
  }

  const onDownloadFilteredChanges = (): void => {
    downloadChangesAsExcel({
      packageKey: packageId!,
      version: versionId!,
      apiType: apiType!,
      textFilter: textFilter!,
      apiKind: kind!,
      apiAudience: apiAudience,
      tag: tag!,
      severityFilter: severityFilter,
      group: resolvedGroupName!,
      emptyGroup: resolvedEmptyGroup,
      refPackageId: refPackageId!,
      emptyTag: emptyTag!,
      previousVersion: previousVersion!,
      previousVersionPackageId: previousVersionPackageId!,
    })
  }

  return <ExportMenuButton
    disabled={isDownloadButtonDisabled}
    title="Export Changes to Excel"
    allDownloadText="All changes"
    filteredDownloadText="Filtered changes"
    downloadAll={onDownloadAllChanges}
    downloadFiltered={onDownloadFilteredChanges}
  />
})

function isEmptyChangesSummary(changeSeverities: ReadonlySet<ChangeSeverity>, changesSummary: Record<ChangeSeverity, number> | undefined): boolean {
  return !changesSummary || Object.entries(changesSummary).every((
    [key, value]) => !changeSeverities.has(key as ChangeSeverity) || value === 0,
  )
}
