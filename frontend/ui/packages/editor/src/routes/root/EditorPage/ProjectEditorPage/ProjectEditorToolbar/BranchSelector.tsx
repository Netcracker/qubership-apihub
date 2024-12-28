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
import { memo, useState } from 'react'
import {
  Box,
  Button,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import { useProject } from '../../../useProject'
import { useBranchSearchParam } from '../../../useBranchSearchParam'
import { useHasEditBranchPermission } from '../useHasBranchPermission'
import { useEventBus } from '../../../../EventBusProvider'

import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import VisibilityIcon from '@mui/icons-material/Visibility'
import type { Column } from 'react-table'
import { useTable } from 'react-table'

import { useBranches } from '../../../useBranches'
import { useNavigation } from '../../../../NavigationProvider'
import { MenuButtonItems } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import { TitledValue } from '@apihub/components/TitledValue'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import { BRANCH_SEARCH_PARAM, MODE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { FILES_PROJECT_EDITOR_MODE } from '@apihub/entities/editor-modes'
import type { Branch } from '@apihub/entities/branches'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import { FormattedDate } from '@netcracker/qubership-apihub-ui-shared/components/FormattedDate'

export const BranchSelector: FC = memo(() => {
  const [anchor, setAnchor] = useState<HTMLElement>()
  const { showCreateBranchDialog } = useEventBus()

  const [project] = useProject()
  const [selectedBranch] = useBranchSearchParam()

  const [searchValue, setSearchState] = useState('')
  const branches = useBranches(searchValue)

  const hasEditPermission = useHasEditBranchPermission()
  const { navigateToProject } = useNavigation()

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable({ columns: COLUMNS, data: branches })

  return (
    <Button
      sx={{ minWidth: 4, height: 20, p: 0, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}
      variant="text"
      onClick={({ currentTarget }) => setAnchor(currentTarget)}
      endIcon={<KeyboardArrowDownOutlinedIcon/>}
    >
      <Typography noWrap variant="subtitle3" color="inherit">{selectedBranch}</Typography>
      <MenuButtonItems
        anchorEl={anchor}
        open={!!anchor}
        onClick={(event) => event.stopPropagation()}
        onClose={() => setAnchor(undefined)}
      >
        <Box sx={{ p: 2 }}>
          <TitledValue
            sx={{ pb: 2 }}
            title="Git repository"
            value={<Link href={project?.integration?.repositoryUrl}>{project?.integration?.repositoryName}</Link>}
          />
          <SearchBar onValueChange={setSearchState}/>
          {
            hasEditPermission && <Button
              sx={{ mt: 1, mb: -1, p: 1 }}
              variant="text"
              startIcon={<AddOutlinedIcon/>}
              onClick={() => {
                setAnchor(undefined)
                showCreateBranchDialog()
              }}
            >
              Create new branch
            </Button>
          }
          <TableContainer sx={{ mt: 1, maxHeight: 400 }}>
            <Table {...getTableProps()} sx={{ maxWidth: 600 }}>
              <TableHead>
                {
                  headerGroups.map(headerGroup => (
                    <TableRow {...headerGroup.getHeaderGroupProps()}>
                      {
                        headerGroups.map(headerGroup => headerGroup.headers.map(column => (
                          <TableCell
                            {...column.getHeaderProps({ style: { width: column.width } })}
                            key={column.id}
                            align={column.id === 'name' ? 'left' : 'right'}
                          >
                            {column.render('Header')}
                          </TableCell>
                        )))
                      }
                    </TableRow>
                  ))
                }
              </TableHead>
              <TableBody {...getTableBodyProps()}>
                {
                  rows
                    .map(row => {
                      prepareRow(row)
                      return (
                        <TableRow {...row.getRowProps()}>
                          {
                            row.cells.map((cell) => (
                              <TableCell
                                align="right"
                                key={cell.column.id}
                                onClick={event => {
                                  event.stopPropagation()
                                  navigateToProject({
                                    search: {
                                      [BRANCH_SEARCH_PARAM]: { value: row.original.name },
                                      [MODE_SEARCH_PARAM]: { value: FILES_PROJECT_EDITOR_MODE },
                                    },
                                    replace: true,
                                  })
                                  setAnchor(undefined)
                                }}
                              >
                                {cell.render('Cell')}
                              </TableCell>
                            ))
                          }
                        </TableRow>
                      )
                    })
                }
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </MenuButtonItems>
    </Button>
  )
})

const COLUMNS: ReadonlyArray<Column<Branch>> = [
  {
    accessor: 'name',
    width: '38%',
    Header: 'Branch',
    Cell: ({ row: { original: { permissions, name } } }) => (
      <Box display="flex" alignItems="center" gap={1}>
        {
          isNotEmpty(permissions)
            ? null
            : <Tooltip title="Read-only">{<VisibilityIcon fontSize="inherit" color="disabled"/>}</Tooltip>
        }
        <OverflowTooltip title={name ?? ''}>
          <Typography noWrap variant="inherit">{name}</Typography>
        </OverflowTooltip>
      </Box>
    ),
  },
  {
    accessor: 'version',
    width: '15%',
    Header: 'Version',
    Cell: ({ value }) => (
      <OverflowTooltip title={value ?? ''}>
        <Typography noWrap variant="inherit">{value}</Typography>
      </OverflowTooltip>
    ),
  },
  {
    accessor: 'status',
    width: '20%',
    Header: 'Status',
    Cell: ({ value }) => <>
      {value && <CustomChip value={value}/>}
    </>,
  },
  {
    accessor: 'publishedAt',
    width: '22%',
    Header: 'Last Published',
    Cell: ({ row: { original: { publishedAt } } }) => <>
      {publishedAt && <FormattedDate value={publishedAt}/>}
    </>,
  },
]
