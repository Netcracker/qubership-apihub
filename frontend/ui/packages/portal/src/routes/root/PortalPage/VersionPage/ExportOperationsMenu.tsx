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
import { useDownloadOperationsAsExcel } from './useDownloadOperationsAsExcel'
import { useFullMainVersion } from '../FullMainVersionProvider'
import type { ApiAudience, ApiKind } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import {
  useResolvedOperationGroupParameters,
} from '@netcracker/qubership-apihub-ui-shared/hooks/operation-groups/useResolvedOperationGroupParameters'
import { ExportMenuButton } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ExportMenuButton'

export type ExportOperationsMenuProps = {
  textFilter?: string
  kind?: ApiKind
  apiAudience?: ApiAudience
  tag?: string
  group?: string
  disabled?: boolean
  refPackageId?: string
  emptyTag?: boolean
  onlyDeprecated?: boolean
  title?: string
}

export const ExportOperationsMenu: FC<ExportOperationsMenuProps> = memo(({
  textFilter,
  kind,
  apiAudience,
  tag,
  group,
  disabled,
  refPackageId,
  emptyTag,
  onlyDeprecated = false,
  title,
}) => {
  const { packageId, apiType = DEFAULT_API_TYPE } = useParams()

  const [downloadOperationsAsExcel] = useDownloadOperationsAsExcel()
  const fullVersion = useFullMainVersion()

  const { resolvedGroupName, resolvedEmptyGroup } = useResolvedOperationGroupParameters(group)

  const onDownloadAllOperations = (): void => {
    downloadOperationsAsExcel({
      packageKey: packageId!,
      version: fullVersion!,
      apiType: apiType!,
      onlyDeprecated: onlyDeprecated!,
    })
  }

  const onDownloadFilteredOperations = (): void => {
    downloadOperationsAsExcel({
      packageKey: packageId!,
      version: fullVersion!,
      apiType: apiType!,
      textFilter: textFilter!,
      kind: kind!,
      apiAudience: apiAudience,
      tag: tag!,
      group: resolvedGroupName!,
      emptyGroup: resolvedEmptyGroup,
      refPackageId: refPackageId!,
      emptyTag: emptyTag!,
      onlyDeprecated: onlyDeprecated!,
    })
  }

  return <ExportMenuButton
    disabled={disabled}
    title={title ?? 'Export Operations to Excel'}
    allDownloadText="All operations"
    filteredDownloadText="Filtered operations"
    downloadAll={onDownloadAllOperations}
    downloadFiltered={onDownloadFilteredOperations}
  />
})
