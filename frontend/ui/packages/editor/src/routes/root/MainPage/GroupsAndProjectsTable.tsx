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
  Typography,
} from '@mui/material'
import type { FC } from 'react'
import { memo, useRef } from 'react'
import { useIsFavoriteMainViewMode } from './useMainPageMode'
import { useFavorProject } from './useFavorProject'
import { useDisfavorProject } from './useDisfavorProject'

import { NavLink } from 'react-router-dom'
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded'
import StarRoundedIcon from '@mui/icons-material/StarRounded'

import { useTextSearchParam } from '../useTextSearchParam'
import { usePagedProjects } from './usePagedProjects'
import { getProjectPath } from '../../NavigationProvider'
import { useIntersectionObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useIntersectionObserver'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import {
  CONTENT_PLACEHOLDER_AREA,
  NO_SEARCH_RESULTS,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { BRANCH_SEARCH_PARAM, MODE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { FILES_PROJECT_EDITOR_MODE } from '@apihub/entities/editor-modes'
import { calculateProjectPath } from '@apihub/utils/projects'

export const GroupsAndProjectsTable: FC = memo(() => {
  const [textFilter] = useTextSearchParam()
  const onlyFavorite = useIsFavoriteMainViewMode()

  const [projects, isLoading, fetchNextPage, isFetchingNextPage, hasNextPage] = usePagedProjects({
    onlyFavorite: onlyFavorite,
    textFilter: textFilter,
    limit: 100,
    page: 1,
  })

  const favorProject = useFavorProject()
  const disfavorProject = useDisfavorProject()

  const ref = useRef<HTMLTableRowElement>(null)
  useIntersectionObserver(ref, isFetchingNextPage, hasNextPage, fetchNextPage)

  if (isLoading) {
    return (
      <LoadingIndicator/>
    )
  }

  return (
    <Placeholder
      invisible={isNotEmpty(projects)}
      area={CONTENT_PLACEHOLDER_AREA}
      message={textFilter ? NO_SEARCH_RESULTS : 'No projects'}
    >
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {
                columns.map(({ key, label }) => {
                  return (
                    <TableCell key={key}
                               sx={{ width: { favorite: '32px', name: '55%', id: 'auto', group: 'auto' }[key] }}>
                      <Typography noWrap variant="subtitle2" sx={{ pl: 0 }}>
                        {label}
                      </Typography>
                    </TableCell>
                  )
                })
              }
            </TableRow>
          </TableHead>
          <TableBody>
            {
              projects.map((project) => (
                <TableRow role="checkbox" tabIndex={-1} key={project.key}>
                  {
                    columns.map(column => {
                      const { favorite, key, name, integration } = project
                      switch (column.key) {
                      case 'favorite': {
                        return (
                          <TableCell
                            key={column.key}
                            sx={{ fontSize: 0, width: 48 }}
                            onClick={() => {
                              favorite ? disfavorProject(key) : favorProject(key)
                            }}
                          >
                            {
                              favorite
                                ? <StarRoundedIcon fontSize="small" color="warning"/>
                                : <StarOutlineRoundedIcon fontSize="small" color="action"/>
                            }
                          </TableCell>
                        )
                      }
                      case 'name': {
                        return (
                          <TableCell key={column.key}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Link
                                component={NavLink}
                                to={getProjectPath({
                                  projectKey: key,
                                  search: {
                                    [BRANCH_SEARCH_PARAM]: { value: integration?.defaultBranch },
                                    [MODE_SEARCH_PARAM]: { value: FILES_PROJECT_EDITOR_MODE },
                                  },
                                })}>
                                {name}
                              </Link>
                            </Box>
                          </TableCell>
                        )
                      }
                      case 'id': {
                        return (
                          <TableCell key={column.key}>
                            {key}
                          </TableCell>
                        )
                      }
                      case 'group': {
                        return (
                          <TableCell key={column.key}>
                            {calculateProjectPath(project)}
                          </TableCell>
                        )
                      }
                      }
                    })
                  }
                </TableRow>
              ))
            }
            <TableRow>
              {hasNextPage && columns.map(cell =>
                <TableCell ref={ref} key={cell.key}>
                  <Skeleton variant="text"/>
                </TableCell>,
              )}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Placeholder>
  )
})

const columns: ReadonlyArray<Column> = [
  { key: 'favorite', label: '' },
  { key: 'name', label: 'Name' },
  { key: 'id', label: 'ID' },
  { key: 'group', label: 'Group' },
]

interface Column {
  key: 'favorite' | 'name' | 'id' | 'group'
  label: string
}
