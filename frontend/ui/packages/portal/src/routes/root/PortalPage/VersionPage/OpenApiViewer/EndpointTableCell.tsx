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

import type { Row } from '@tanstack/react-table'
import type { FC } from 'react'
import { memo, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Box } from '@mui/material'
import { useBackwardLocation } from '../../../useBackwardLocation'
import { usePackageKind } from '../../usePackageKind'
import type { Path } from '@remix-run/router'
import { getOperationsPath } from '../../../../NavigationProvider'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { OperationData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { useBackwardLocationContext, useSetBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import { ExpandableItem } from '@netcracker/qubership-apihub-ui-shared/components/ExpandableItem'
import { OperationTitleWithMeta } from '@netcracker/qubership-apihub-ui-shared/components/Operations/OperationTitleWithMeta'
import { DOCUMENT_SEARCH_PARAM, REF_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'

export type EndpointTableCellProps = {
  value: Row<CellData>
  documentSlug?: Key
  isSubTable?: boolean
}

type CellData = {
  operation: OperationData
}

export const EndpointTableCell: FC<EndpointTableCellProps> = memo<EndpointTableCellProps>((props) => {
  const {
    value: {
      original: { operation },
      getCanExpand,
      getIsExpanded,
      getToggleExpandedHandler,
    },
    documentSlug,
    isSubTable = false,
  } = props

  const location = useBackwardLocation()
  const backwardLocation = useBackwardLocationContext()
  const setBackwardLocation = useSetBackwardLocationContext()
  const link = useOperationLink(operation, documentSlug)
  const onClickLink = (): void => {
    setBackwardLocation({ ...backwardLocation, fromOperation: location })
  }

  const expandable = useMemo(() => getCanExpand(), [getCanExpand])
  const isExpanded = useMemo(() => getIsExpanded(), [getIsExpanded])

  return (
    <Box sx={{ ml: isSubTable ? 3 : 0 }}>
      <ExpandableItem expanded={isExpanded} showToggler={expandable} onToggle={getToggleExpandedHandler()}>
        <OperationTitleWithMeta
          operation={operation}
          link={link}
          onLinkClick={onClickLink}
          badgeText={operation.deprecated ? 'Deprecated' : undefined}
        />
      </ExpandableItem>
    </Box>
  )
})

function useOperationLink({ operationKey, apiType, packageRef }: OperationData, documentSlug?: Key): Partial<Path> {
  const { packageId, versionId } = useParams()
  const ref = useSearchParam(REF_SEARCH_PARAM)
  const [kind] = usePackageKind()

  return useMemo(
    () => getOperationsPath({
      packageKey: packageId!,
      versionKey: versionId!,
      apiType: apiType ?? DEFAULT_API_TYPE,
      operationKey: operationKey!,
      search: {
        [REF_SEARCH_PARAM]: { value: kind === DASHBOARD_KIND && (packageRef || ref) ? (packageRef?.key ?? ref!) : '' },
        [DOCUMENT_SEARCH_PARAM]: { value: documentSlug },
      },
    }),
    [apiType, documentSlug, kind, operationKey, packageId, packageRef, ref, versionId],
  )
}
