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
import { memo, useCallback, useMemo } from 'react'
import { useSpecType } from '../../../../useSpecType'
import { useProject } from '../../../../useProject'
import {
  Box,
  Link,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material'
import type { Column, Row } from 'react-table'
import { useTable } from 'react-table'

import { useEventBus } from '../../../../../EventBusProvider'
import { useSelectedFile } from '../../useSelectedFile'
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded'
import { useMonacoEditorContent } from '../../MonacoContentProvider'

import { isOpenApiSpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import type { ProjectFileChangeHistory } from '@apihub/entities/project-file-history'
import { NONE_COMMIT_KEY } from '@apihub/entities/commits'
import { useFileHistory } from './FileHistoryDialog/useFileHistory'
import { FormattedDate } from '@netcracker/qubership-apihub-ui-shared/components/FormattedDate'
import { UserAvatar } from '@netcracker/qubership-apihub-ui-shared/components/Users/UserAvatar'
import { NAVIGATION_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { FileHistoryDialog } from './FileHistoryDialog/FileHistoryDialog'

export const FileHistoryPanel: FC = memo(() => {
  const content = useMonacoEditorContent()
  const { key: fileKey, name } = useSelectedFile() ?? { key: '' }
  const specType = useSpecType(name, content)
  const [fileHistory, isLoading] = useFileHistory(fileKey)

  const [project] = useProject()
  const { showFileHistoryDialog } = useEventBus()

  const onHistoryCompare = useCallback((rows: Row<ProjectFileChangeHistory>[], row: Row<ProjectFileChangeHistory>): void => {
    const commitKey = rows[rows.indexOf(row) + 1]?.original?.key ?? NONE_COMMIT_KEY
    const comparisonCommitKey = row.original.key
    showFileHistoryDialog({ fileKey, commitKey, comparisonCommitKey })
  }, [fileKey, showFileHistoryDialog])

  const columns: ReadonlyArray<Column<ProjectFileChangeHistory>> = useMemo(() => {
    const columns: Column<ProjectFileChangeHistory>[] = [
      {
        accessor: 'modifiedAt',
        width: 80,
        Header: 'Date of change',
        Cell: ({ row: { original: { modifiedAt } } }) => <>
          {modifiedAt && <FormattedDate value={modifiedAt}/>}
        </>,
      },
      {
        accessor: 'modifiedBy',
        width: 44,
        Header: 'User',
        Cell: ({ value }) => (
          <UserAvatar
            size="small"
            name={value.name}
            src={value.avatarUrl}
          />
        ),
      },
      {
        accessor: 'comment',
        Header: 'Comment',
        Cell: ({ row: { original: { commitId, comment } } }) => (
          <Link
            href={`${project?.integration?.repositoryUrl?.substring(0, project?.integration?.repositoryUrl?.lastIndexOf('.'))}/commit/${commitId}`}
          >
            {comment}
          </Link>
        ),
      },
    ]

    if (isOpenApiSpecType(specType)) {
      columns.push({
        accessor: 'commitId',
        width: 30,
        Header: '',
        Cell: () => (
          <Tooltip title="Compare with previous">
            <Box
              className="hoverable"
              sx={{ visibility: 'hidden' }}
            >
              <CompareArrowsRoundedIcon sx={{ color: '#626D82' }}/>
            </Box>
          </Tooltip>
        ),
      })
    }

    return columns
  }, [project?.integration?.repositoryUrl, specType])

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable({ columns: columns, data: fileHistory })

  return (
    <>
      {
        isLoading
          ? <FileHistorySkeleton/>
          : <Placeholder
            invisible={isNotEmpty(fileHistory)}
            area={NAVIGATION_PLACEHOLDER_AREA}
            message="No history items"
          >
            <TableContainer>
              <Table {...getTableProps()} >
                <TableHead>
                  {headerGroups.map(({ getHeaderGroupProps }) => (
                    <TableRow {...getHeaderGroupProps()}>
                      {headerGroups.map(({ headers }) => headers.map(({ getHeaderProps, id, render, width }) => (
                        <TableCell {...getHeaderProps({ style: { width: width } })} key={id}>
                          {render('Header')}
                        </TableCell>
                      )))}
                    </TableRow>
                  ))}
                </TableHead>
                <TableBody {...getTableBodyProps()}>
                  {
                    rows.map(row => {
                      prepareRow(row)
                      return (
                        <TableRow {...row.getRowProps()}>
                          {row.cells.map((cell) => (
                            <TableCell
                              key={cell.column.id}
                              align={cell.column.id === 'commitId' ? 'right' : 'left'}
                              onClick={() => cell.column.id === 'commitId' && onHistoryCompare(rows, row)}
                            >
                              {cell.render('Cell')}
                            </TableCell>
                          ))}
                        </TableRow>
                      )
                    })
                  }
                </TableBody>
              </Table>
            </TableContainer>
          </Placeholder>
      }
      <FileHistoryDialog/>
    </>
  )
})

const FileHistorySkeleton: FC = memo(() => {
  return (
    <Box sx={{ pt: 1, pl: 2 }}>
      {[...Array(4)].map((_, index) => (
        <Box
          key={index}
          sx={{
            mb: '5px',
            display: 'grid',
            gridTemplateAreas: `
              'version date user comment'
            `,
          }}
        >
          <Skeleton sx={{ gridArea: 'version' }} variant="text" width={94} height={22}/>
          <Skeleton sx={{ gridArea: 'date' }} variant="text" width={118} height={22}/>
          <Skeleton sx={{ gridArea: 'user' }} variant="circular" width={15} height={15}/>
          <Skeleton sx={{ gridArea: 'comment' }} variant="text" width={184} height={22}/>
        </Box>
      ))}
    </Box>
  )
})
