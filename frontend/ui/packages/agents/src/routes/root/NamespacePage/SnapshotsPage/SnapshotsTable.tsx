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
import { Fragment, memo, useMemo, useState } from 'react'
import { useSnapshots } from '../useSnapshots'
import type { ColumnDef } from '@tanstack/table-core'
import {
  Box,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import KeyboardArrowRightOutlinedIcon from '@mui/icons-material/KeyboardArrowRightOutlined'
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded'
import type { ExpandedState } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, getExpandedRowModel, useReactTable } from '@tanstack/react-table'
import { SnapshotsSubTable } from './SnapshotsSubTable'
import {
  BACKWARD_COMPATIBLE_MESSAGE,
  BACKWARD_INCOMPATIBLE_MESSAGE,
  BASELINE_VERSION_NOT_FOUND_MESSAGE,
} from '../ServicesPage/ServicesPageBody/validationMessages'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import { FormattedDate } from '@netcracker/qubership-apihub-ui-shared/components/FormattedDate'
import {
  ERROR_STATUS_MARKER_VARIANT,
  StatusMarker,
  SUCCESS_STATUS_MARKER_VARIANT,
  WARNING_STATUS_MARKER_VARIANT,
} from '@netcracker/qubership-apihub-ui-shared/components/StatusMarker'
import { Changes } from '@netcracker/qubership-apihub-ui-shared/components/Changes'
import type { Snapshot } from '@apihub/entities/snapshots'
import type { ServicePublishInfo } from '@apihub/entities/service-publish-info'
import type { ChangesSummary } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'

export const SnapshotsTable: FC = memo(() => {
  const [{ snapshots }] = useSnapshots()

  const columns: ColumnDef<SnapshotsTableData>[] = useMemo(() => [
    {
      id: SNAPSHOT_OR_SERVICE_COLUMN_ID,
      header: 'Snapshot / Service',
      cell: ({
        row: {
          getCanExpand,
          getToggleExpandedHandler,
          getIsExpanded,
          original: { snapshot, servicePublishInfo },
        },
      }) => {
        if (snapshot) {
          const snapshotName = getSplittedVersionKey(snapshot.versionKey).versionKey
          return (
            <Box display="flex" alignItems="center" gap={1}>
              {getCanExpand() && (
                <IconButton sx={{ p: 0 }} onClick={getToggleExpandedHandler()}>
                  {getIsExpanded()
                    ? <KeyboardArrowDownOutlinedIcon sx={{ fontSize: '16px' }}/>
                    : <KeyboardArrowRightOutlinedIcon sx={{ fontSize: '16px' }}/>}
                </IconButton>
              )}

              <OverflowTooltip sx={{ height: 19 }} title={snapshotName}>
                <Typography noWrap variant="inherit">{snapshotName}</Typography>
              </OverflowTooltip>
            </Box>
          )
        }

        if (servicePublishInfo) {
          return (
            <OverflowTooltip sx={{ pl: 5, height: 19 }} title={servicePublishInfo.key}>
              <Typography noWrap variant="inherit">{servicePublishInfo.key}</Typography>
            </OverflowTooltip>
          )
        }

        return null
      },
    },
    {
      id: PUBLISHED_DATE_COLUMN_ID,
      header: 'Published Date',
      cell: ({ row: { original: { publishedDate } } }) => (
        publishedDate && (
          <FormattedDate value={publishedDate}/>
        )
      ),
    },
    {
      id: BASELINE_OR_BWC_STATUS_COLUMN_ID,
      header: 'Baseline / BWC Status',
      cell: ({ row: { original: { snapshot, servicePublishInfo, bwcErrors, viewChangesUrl } } }) => {
        if (snapshot) {
          return null
        }

        if (servicePublishInfo) {
          if (!viewChangesUrl) {
            return (
              <Box display="flex" gap={1}>
                <StatusMarker value={WARNING_STATUS_MARKER_VARIANT}/>
                <Typography noWrap variant="inherit">{BASELINE_VERSION_NOT_FOUND_MESSAGE}</Typography>
              </Box>
            )
          }

          if (bwcErrors !== undefined) {
            const areBwcErrorsExist = bwcErrors > 0
            return (
              <Box display="flex" gap={1}>
                <StatusMarker value={areBwcErrorsExist ? ERROR_STATUS_MARKER_VARIANT : SUCCESS_STATUS_MARKER_VARIANT}/>
                <Typography noWrap
                            variant="inherit">{areBwcErrorsExist ? BACKWARD_INCOMPATIBLE_MESSAGE : BACKWARD_COMPATIBLE_MESSAGE}</Typography>
              </Box>
            )
          }
        }

        return null
      },
    },
    {
      id: CHANGES_COLUMN_ID,
      header: 'Changes',
      cell: ({ row: { original: { changeSummary, viewChangesUrl } } }) => {
        if (viewChangesUrl && changeSummary) {
          return (
            <Changes mode="compact" value={changeSummary}/>
          )
        }

        return null
      },
    },
    {
      id: VIEW_CHANGES_URL_COLUMN_ID,
      cell: ({ row: { original: { viewChangesUrl } } }) => (
        viewChangesUrl && (
          <Button
            sx={{ visibility: 'hidden', p: 0, height: 10, whiteSpace: 'nowrap' }}
            className="hoverable"
            component="a"
            variant="text"
            href={viewChangesUrl}
            target="_blank"
            startIcon={<ArrowOutwardRoundedIcon/>}
          >
            View Changes
          </Button>
        )
      ),
    },
  ], [])

  const [expanded, setExpanded] = useState<ExpandedState>({})

  const data: SnapshotsTableData[] = useMemo(() => snapshots.map(snapshot => ({
    snapshot: snapshot,
    publishedDate: snapshot.createdAt,
    baselineOrChanges: snapshot.previousVersionKey,
  })), [snapshots])

  const { getHeaderGroups, getRowModel } = useReactTable({
    data: data,
    columns: columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getRowCanExpand: ({ original: { snapshot } }) => !!snapshot,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  })

  return (
    <TableContainer sx={{ mt: 1 }}>
      <Table>
        <TableHead>
          {getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableCell
                  key={header.id}
                  align="left"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {getRowModel().rows.map(row => (
            <Fragment key={row.id}>
              <TableRow>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.column.id} data-testid={`Cell-${cell.column.id}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
              {row.original.snapshot && row.getIsExpanded() && (
                <SnapshotsSubTable value={row} lastColumnId={VIEW_CHANGES_URL_COLUMN_ID}/>
              )}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
})

const SNAPSHOT_OR_SERVICE_COLUMN_ID = 'snapshot-or-service'
const PUBLISHED_DATE_COLUMN_ID = 'published-date'
const BASELINE_OR_BWC_STATUS_COLUMN_ID = 'baseline-or-bwc-status'
const CHANGES_COLUMN_ID = 'changes'
const VIEW_CHANGES_URL_COLUMN_ID = 'view-changes-url'

export type SnapshotsTableData = Partial<{
  snapshot: Snapshot
  servicePublishInfo: ServicePublishInfo
  publishedDate: string
  bwcErrors: number
  changeSummary: ChangesSummary
  viewChangesUrl: string
}>
