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
import { flexRender } from '@tanstack/react-table'
import type { FC } from 'react'
import { memo } from 'react'
import { useSnapshotPublicationInfo } from '../useSnapshotPublicationInfo'
import { Skeleton, TableCell, TableRow, Typography } from '@mui/material'
import type { SnapshotsTableData } from './SnapshotsTable'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

export type SnapshotsSubTableProps = {
  value: Row<SnapshotsTableData>
  lastColumnId: string
}

export const SnapshotsSubTable: FC<SnapshotsSubTableProps> = memo<SnapshotsSubTableProps>(({
  value: {
    id,
    original,
    getVisibleCells,
  }, lastColumnId,
}) => {
  const { snapshotPublicationInfo, isLoading: isSnapshotPublicationInfoLoading } = useSnapshotPublicationInfo({
    snapshotKey: original.snapshot!.versionKey,
  })

  if (isSnapshotPublicationInfoLoading) {
    return (
      <TableRow key={id}>
        {getVisibleCells().map(({ column: { id } }) => (
          <TableCell key={id}>
            <Skeleton variant="text"/>
          </TableCell>
        ))}
      </TableRow>
    )
  }

  if (isEmpty(snapshotPublicationInfo.services)) {
    return (
      <TableRow key={id}>
        <TableCell colSpan={getVisibleCells().length}>
          <Typography noWrap variant="inherit" color="#8F9EB4" pl={5}>No services</Typography>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <>
      {snapshotPublicationInfo.services.map(service => (
        <TableRow key={`${id}-${service.key}`}>
          {getVisibleCells().map(({ column: { id, columnDef }, getContext }) => (
            <TableCell
              data-testid={`Cell-${id}`}
              key={id}
              align={id === lastColumnId ? 'right' : 'left'}
            >
              {flexRender(columnDef.cell, {
                ...getContext(),
                row: {
                  ...getContext().row,
                  original: {
                    servicePublishInfo: service,
                    changeSummary: service.changeSummary,
                    bwcErrors: service.viewChangesUrl ? service.changeSummary?.breaking : undefined,
                    viewChangesUrl: service.viewChangesUrl,
                  },
                },
              })}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
})
