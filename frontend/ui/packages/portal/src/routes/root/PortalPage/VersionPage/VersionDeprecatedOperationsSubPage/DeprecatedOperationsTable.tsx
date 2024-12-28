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
import * as React from 'react'
import { memo, useCallback, useMemo } from 'react'

import type { OpenApiTableData } from '../OpenApiViewer/OpenApiTable'
import { OpenApiTable } from '../OpenApiViewer/OpenApiTable'

import { DeprecatedItemsSubTable } from './DeprecatedItemsSubTable'
import type { ColumnDef } from '@tanstack/table-core'
import { Box, Typography } from '@mui/material'
import Tooltip from '@mui/material/Tooltip'
import type { Row } from '@tanstack/react-table'
import type { ColumnModel } from '@netcracker/qubership-apihub-ui-shared/hooks/table-resizing/useColumnResizing'
import type { FetchNextOperationList, OperationsData, OperationWithDeprecations } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { HasNextPage, IsFetchingNextPage, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { useCurrentPackage } from '@apihub/components/CurrentPackageProvider'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { CustomTableHeadCell } from '@netcracker/qubership-apihub-ui-shared/components/CustomTableHeadCell'
import { InfoIcon } from '@netcracker/qubership-apihub-ui-shared/icons/InfoIcon'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { API_AUDIENCE_COLUMN_ID, API_KIND_COLUMN_ID, ENDPOINT_COLUMN_ID, PACKAGE_COLUMN_ID, TAGS_COLUMN_ID } from '@netcracker/qubership-apihub-ui-shared/entities/table-columns'

export const DETAILS_COLUMN_ID = 'details'
export const DEPRECATED_SINCE_COLUMN_ID = 'deprecated-since'

const DASHBOARD_COLUMNS_MODELS: ColumnModel[] = [
  { name: ENDPOINT_COLUMN_ID },
  { name: TAGS_COLUMN_ID, width: 160 },
  { name: PACKAGE_COLUMN_ID, fixedWidth: 200 },
  { name: API_AUDIENCE_COLUMN_ID, width: 100 },
  { name: API_KIND_COLUMN_ID, width: 100 },
  { name: DETAILS_COLUMN_ID, width: 100 },
  { name: DEPRECATED_SINCE_COLUMN_ID, width: 120 },
]

const PACKAGE_COLUMNS_MODELS: ColumnModel[] = [
  { name: ENDPOINT_COLUMN_ID },
  { name: TAGS_COLUMN_ID, width: 240 },
  { name: API_AUDIENCE_COLUMN_ID, width: 100 },
  { name: API_KIND_COLUMN_ID, width: 89 },
  { name: DETAILS_COLUMN_ID, width: 140 },
  { name: DEPRECATED_SINCE_COLUMN_ID, width: 140 },
]

export type DeprecatedOperationsTabProps = {
  operations: OperationsData
  isLoading: IsLoading
  fetchNextPage: FetchNextOperationList
  isFetchingNextPage: IsFetchingNextPage
  hasNextPage: HasNextPage
}

export const DeprecatedOperationsTable: FC<DeprecatedOperationsTabProps> = memo<DeprecatedOperationsTabProps>(({
  operations,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  isLoading,
}) => {
  const currentPackage = useCurrentPackage()
  const isDashboard = currentPackage?.kind === DASHBOARD_KIND

  const deprecatedInfoColumns: ColumnDef<OpenApiTableData>[] = useMemo(() => [
    {
      id: DETAILS_COLUMN_ID,
      header: () => <CustomTableHeadCell title="Details" />,
      cell: ({ row: { original: { operation } } }) => {
        const { deprecatedCount, deprecatedInfo } = operation as OperationWithDeprecations
        if (deprecatedCount) {
          return (
            <Box display="flex" alignItems="center">
              <Box component="span" sx={{ background: '#FFB02E', width: 12, height: 12, borderRadius: '50%', mr: 1 }} />
              <Typography noWrap component="span" sx={{ fontSize: 12, fontWeight: 500, color: '#353C4E', mr: 1.5 }}>
                {deprecatedCount}
              </Typography>

              {deprecatedInfo && (
                <Box
                  sx={{ visibility: 'hidden', height: '20px' }}
                  className="hoverable"
                >
                  <Tooltip
                    disableHoverListener={false}
                    title={<DeprecatedInfo info={deprecatedInfo} />}
                    placement="right"
                  >
                    <Box sx={{ display: 'inline' }}>
                      <InfoIcon />
                    </Box>
                  </Tooltip>
                </Box>
              )}

            </Box>
          )
        }
      },
    },
    {
      id: DEPRECATED_SINCE_COLUMN_ID,
      header: () => <CustomTableHeadCell title="Deprecated Since" />,
      cell: ({ row: { original: { operation } } }) => {
        const [deprecatedSince] = (operation as OperationWithDeprecations)?.deprecatedInPreviousVersions ?? []
        if (deprecatedSince) {
          const { versionKey: versionToDisplay } = getSplittedVersionKey(deprecatedSince)

          return <TextWithOverflowTooltip tooltipText={versionToDisplay}>
            {versionToDisplay}
          </TextWithOverflowTooltip>
        }
      },
    },
  ], [])

  const isDeprecatedItemsShown = useCallback(({ original: { operation } }: Row<OpenApiTableData>) => {
    const operationWithDeprecations = (operation as OperationWithDeprecations)
    const onlyDeprecatedOperationItem = operationWithDeprecations.deprecated && Number(operationWithDeprecations?.deprecatedCount ?? 0) === 1
    return !onlyDeprecatedOperationItem
  }, [])

  return (
    <OpenApiTable
      value={operations}
      fetchNextPage={fetchNextPage}
      isNextPageFetching={isFetchingNextPage}
      hasNextPage={hasNextPage}
      additionalColumns={deprecatedInfoColumns}
      isExpandableRow={isDeprecatedItemsShown}
      SubTableComponent={DeprecatedItemsSubTable}
      columnSizes={isDashboard ? DASHBOARD_COLUMNS_MODELS : PACKAGE_COLUMNS_MODELS}
      tableMinWidth={700}
      isLoading={isLoading}
    />
  )
})

export const DeprecatedInfo: FC<{ info: string }> = memo<{ info: string }>(({ info }) =>
  <Box>
    <Typography component="span" variant="body2">{info}</Typography>
  </Box>,
)
