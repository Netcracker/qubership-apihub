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

import type { Dispatch, FC, SetStateAction } from 'react'
import { memo, useCallback, useMemo, useState } from 'react'
import {
  Box,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  Typography,
} from '@mui/material'
import type { Column } from 'react-table'
import { useTable } from 'react-table'

import { useBranchSearchParam } from '../../useBranchSearchParam'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  useErrorFileProblemCount,
  useFileProblems,
  useInfoFileProblemCount,
  useWarnFileProblemCount,
} from './useFileProblems'
import type {
  FileProblem,
  FileProblemType,
} from '@apihub/entities/file-problems'
import {
  ERROR_FILE_PROBLEM_TYPE, INFO_FILE_PROBLEM_TYPE,
  WARN_FILE_PROBLEM_TYPE,
} from '@apihub/entities/file-problems'
import {
  DEFAULT_STATUS_MARKER_VARIANT,
  ERROR_STATUS_MARKER_VARIANT,
  StatusMarker,
  WARNING_STATUS_MARKER_VARIANT,
} from '@netcracker/qubership-apihub-ui-shared/components/StatusMarker'
import { FILES_PROJECT_EDITOR_MODE } from '@apihub/entities/editor-modes'
import { includes } from '@netcracker/qubership-apihub-ui-shared/utils/filters'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import {
  NAVIGATION_PLACEHOLDER_AREA,
  NO_SEARCH_RESULTS,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { CustomToggleButtonGroup } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/CustomToggleButtonGroup'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import type { FileKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

export type ValidationProblemsPanelProps = {
  fileKey?: FileKey
}

export const FileProblemsPanel: FC<ValidationProblemsPanelProps> = memo<ValidationProblemsPanelProps>(({ fileKey }) => {
  const navigate = useNavigate()
  const [problems, isValidating] = useFileProblems(fileKey, true)
  const [branch] = useBranchSearchParam()
  const [searchValue, setSearchState] = useState('')
  const [filter, setFilter] = useState<(FileProblemType | null)[]>([])

  const handleLinkClick = useCallback((to: { search: string; hash: string }) => {
    navigate({ ...to, hash: `${to.hash}C1` })
    setTimeout(() => navigate(to))
  }, [navigate])

  const columns: ReadonlyArray<Column<FileProblem>> = useMemo(() => {
    return [
      {
        accessor: 'type',
        width: 50,
        Header: 'Type',
        Cell: ({ value }) => (
          <>
            {value === ERROR_FILE_PROBLEM_TYPE && (
              <StatusMarker
                value={ERROR_STATUS_MARKER_VARIANT}
                title="Error"
                placement="left"
              />
            )}
            {value === WARN_FILE_PROBLEM_TYPE && (
              <StatusMarker
                value={WARNING_STATUS_MARKER_VARIANT}
                title="Warning"
                placement="left"
              />
            )}
            {value === INFO_FILE_PROBLEM_TYPE && (
              <StatusMarker
                value={DEFAULT_STATUS_MARKER_VARIANT}
                title="Info"
                placement="left"
              />
            )}
          </>
        ),
      },
      {
        accessor: 'lineNumber',
        width: 50,
        Header: 'Line',
        Cell: ({ row: { original: { externalFilePath, lineNumber, filePath } } }) => {
          if (externalFilePath) {
            return null
          }
          const to = {
            search: `branch=${encodeURIComponent(branch ?? '')}&mode=${FILES_PROJECT_EDITOR_MODE}&file=${encodeURIComponent(filePath)}`,
            hash: `L${lineNumber}`,
          }
          return (
            <Link sx={{ fontFamily: 'Inter', verticalAlign: 'text-top' }} component="button"
                  onClick={() => handleLinkClick(to)}>
              {lineNumber}
            </Link>
          )
        },
      },
      {
        accessor: 'text',
        width: '100%',
        Header: 'Messages',
        Cell: ({ value, row: { original: { externalFilePath, lineNumber } } }) => (
          <>
            <Box sx={{ wordBreak: 'break-word' }}>{value}</Box>
            {
              externalFilePath && <Link
                component={NavLink}
                to={{
                  search: `branch=${encodeURIComponent(branch ?? '')}&mode=${FILES_PROJECT_EDITOR_MODE}&file=${encodeURIComponent(getFilePath(externalFilePath))}`,
                  hash: `L${lineNumber}`,
                }}
              >
                {externalFilePath}
              </Link>
            }
          </>
        ),
      },
    ]
  }, [branch, handleLinkClick])

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable({
    columns: columns,
    data: problems,
  })

  const filteredProblems = useMemo(() => {
    return rows
      .filter(({ values }) => (filter.length > 0 ? filter?.includes(values.type) : true))
      .filter(data => includes([data.values.text, data.values.lineNumber?.toString(), data.original.externalFilePath ?? ''], searchValue))
  }, [filter, rows, searchValue])

  if (isValidating) {
    return (
      <LoadingIndicator/>
    )
  }

  return (
    <Box sx={{
      height: '100%',
      overflow: 'hidden',
      display: 'flex',
      flexFlow: 'column-reverse',
    }}>
      <ProblemsControls
        problems={problems}
        filter={filter}
        setFilter={setFilter}
        setSearchState={setSearchState}
      />
      <Placeholder
        invisible={isNotEmpty(filteredProblems)}
        area={NAVIGATION_PLACEHOLDER_AREA}
        message={searchValue ? NO_SEARCH_RESULTS : 'No problems'}
      >
        <TableContainer>
          <Table {...getTableProps()} >
            <TableHead>
              {headerGroups.map(headerGroup => (
                <TableRow {...headerGroup.getHeaderGroupProps()}>
                  {headerGroups.map(headerGroup => headerGroup.headers.map(column => (
                    <TableCell
                      {...column.getHeaderProps({ style: { width: column.width } })}
                      key={column.id}
                    >
                      {column.render('Header')}
                    </TableCell>
                  )))}
                </TableRow>
              ))}
            </TableHead>

            <TableBody {...getTableBodyProps()}>
              {filteredProblems.map(row => {
                prepareRow(row)
                return (
                  <TableRow {...row.getRowProps()}>
                    {row.cells.map((cell) => (
                      <TableCell key={cell.column.id}>
                        {cell.render('Cell')}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Placeholder>
    </Box>
  )
})

type ProblemsControlsProps = {
  problems: FileProblem[]
  filter: (FileProblemType | null)[]
  setFilter: Dispatch<SetStateAction<(FileProblemType | null)[]>>
  setSearchState: Dispatch<SetStateAction<string>>
}

const ProblemsControls: FC<ProblemsControlsProps> = memo<ProblemsControlsProps>(({
  problems,
  filter,
  setFilter,
  setSearchState,
}) => {
  const errorMessagesCount = useErrorFileProblemCount(problems)
  const warnMessagesCount = useWarnFileProblemCount(problems)
  const infoMessagesCount = useInfoFileProblemCount(problems)

  return (
    <Box sx={{ display: 'flex', mb: 2, gap: 2, order: 1 }}>
      <CustomToggleButtonGroup
        value={filter}
        onClick={(value) => setFilter(value)}
      >
        <ToggleButton value={ERROR_FILE_PROBLEM_TYPE} sx={{ gap: 1 }}>
          <StatusMarker
            value={ERROR_STATUS_MARKER_VARIANT}
            title="Errors"
            placement="top"
          />
          <Typography fontSize={11}>{errorMessagesCount}</Typography>
        </ToggleButton>
        <ToggleButton value={WARN_FILE_PROBLEM_TYPE} sx={{ gap: 1 }}>
          <StatusMarker
            value={WARNING_STATUS_MARKER_VARIANT}
            title="Warnings"
            placement="top"
          />
          <Typography fontSize={11}>{warnMessagesCount}</Typography>
        </ToggleButton>
        <ToggleButton value={INFO_FILE_PROBLEM_TYPE} sx={{ gap: 1 }}>
          <StatusMarker
            value={DEFAULT_STATUS_MARKER_VARIANT}
            title="Infos"
            placement="top"
          />
          <Typography fontSize={11}>{infoMessagesCount}</Typography>
        </ToggleButton>
      </CustomToggleButtonGroup>

      <Box sx={{ flex: 1, maxWidth: 336 }}>
        <SearchBar
          placeholder="Search"
          onValueChange={setSearchState}
        />
      </Box>
    </Box>
  )
})

function getFilePath(fullPath: string): string {
  const [path] = fullPath.split('#')
  return path
}
