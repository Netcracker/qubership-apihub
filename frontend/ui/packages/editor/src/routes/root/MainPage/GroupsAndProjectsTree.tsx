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
import { memo, useCallback, useState } from 'react'
import { useFavorGroup } from './useFavorGroup'
import { useDisfavorGroup } from './useDisfavorGroup'
import { useFavorProject } from './useFavorProject'
import { useDisfavorProject } from './useDisfavorProject'
import { useProjectsByGroup } from '../useProjects'
import { useChildGroups } from '../useGroups'
import {
  Box,
  IconButton,
  Link,
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
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded'
import StarRoundedIcon from '@mui/icons-material/StarRounded'

import { NavLink } from 'react-router-dom'
import { useMainPageCollapsedGroupKeys, useSetMainPageCollapsedGroupKeys } from './MainPageProvider'
import { getProjectPath } from '../../NavigationProvider'
import type { Group } from '@apihub/entities/groups'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { GroupIcon } from '@netcracker/qubership-apihub-ui-shared/icons/GroupIcon'
import type { Project } from '@apihub/entities/projects'
import { BRANCH_SEARCH_PARAM, MODE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { FILES_PROJECT_EDITOR_MODE } from '@apihub/entities/editor-modes'

export const GroupsAndProjectsTree: FC = memo(() => {
  const groups = useChildGroups()

  return (
    <TableContainer sx={{ height: '100%' }}>
      <Table stickyHeader size="small" sx={{ tableLayout: 'fixed' }}>
        <TableHead>
          <TableRow>
            {columns.map(({ key, label }) => (
              <TableCell key={key} sx={{ width: { favorite: '32px', name: '55%', id: 'auto' }[key] }}>
                <Typography noWrap variant="subtitle2" sx={{ pl: key === 'name' ? 3 : 0 }}>
                  {label}
                </Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {groups.map(group => (
            <GroupRow
              key={group.key}
              group={group}
              level={0}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
})

type GroupRowProps = {
  group: Group
  level: number
}

const GroupRow: FC<GroupRowProps> = memo<GroupRowProps>(({
  group: { key, name, favorite },
  level,
}) => {
  const collapsedKeys = useMainPageCollapsedGroupKeys()
  const setCollapsedKeys = useSetMainPageCollapsedGroupKeys()

  const favorGroup = useFavorGroup()
  const disfavorGroup = useDisfavorGroup()

  const [open, setOpen] = useState(collapsedKeys?.includes(key))
  const groups = useChildGroups(key, open)
  const projects = useProjectsByGroup(key, open)

  const nextLevel = level + 1

  const updateCollapseKeys = useCallback((key: Key) => {
    setOpen(!open)
    setCollapsedKeys(previousKey => (
      !previousKey.includes(key)
        ? [...previousKey, key]
        : previousKey.filter(id => id !== key)
    ))
  }, [open, setCollapsedKeys])

  return (
    <>
      <TableRow hover tabIndex={-1} key={key}>
        {
          columns.map(column => {
            switch (column.key) {
              case 'favorite': {
                return (
                  <TableCell
                    sx={{ width: 32 }}
                    key={column.key}
                    onClick={() => (favorite ? disfavorGroup(key) : favorGroup(key))}
                  >
                    {
                      favorite
                        ? <StarRoundedIcon fontSize="small" color="warning" />
                        : <StarOutlineRoundedIcon fontSize="small" color="action" />
                    }
                  </TableCell>
                )
              }
              case 'name': {
                return (
                  <TableCell key={column.key}>
                    <Box sx={{ display: 'flex', alignItems: 'center', pl: (level * 3.5) }}>
                      {(!open || isNotEmpty(groups) || isNotEmpty(projects))
                        ? <IconButton
                          sx={{ p: 0, mr: 1 }}
                          onClick={() => updateCollapseKeys(key)}
                        >
                          {
                            open
                              ? <KeyboardArrowDownOutlinedIcon sx={{ fontSize: '16px' }} />
                              : <KeyboardArrowRightOutlinedIcon sx={{ fontSize: '16px' }} />
                          }
                        </IconButton>
                        : <Box sx={{ width: '24px' }} />
                      }
                      <GroupIcon />
                      <Box sx={{ pl: 0.5 }}>
                        <Typography noWrap variant="body2">{name}</Typography>
                      </Box>
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
            }
          })
        }
      </TableRow>
      {open && groups.map(group => <GroupRow key={group.key} group={group} level={nextLevel} />)}
      {open && projects.map(project => <ProjectRow key={project.key} project={project} level={nextLevel} />)}
    </>
  )
})

type ProjectRowProps = {
  project: Project
  level: number
}

const ProjectRow: FC<ProjectRowProps> = memo<ProjectRowProps>(({
  project: { key, name, favorite, integration },
  level,
}) => {
  const favorProject = useFavorProject()
  const disfavorProject = useDisfavorProject()

  return (
    <>
      <TableRow hover tabIndex={-1} key={key}>
        {
          columns.map(column => {
            switch (column.key) {
              case 'favorite': {
                return (
                  <TableCell
                    sx={{ width: 32 }}
                    key={column.key}
                    onClick={() => (favorite ? disfavorProject(key) : favorProject(key))}
                  >
                    {
                      favorite
                        ? <StarRoundedIcon fontSize="small" color="warning" />
                        : <StarOutlineRoundedIcon fontSize="small" color="action" />
                    }
                  </TableCell>
                )
              }
              case 'name': {
                return (
                  <TableCell key={column.key}>
                    <Box sx={{ display: 'flex', alignItems: 'center', pl: 3.5 * level + 2.5 }}>
                      <Link
                        component={NavLink}
                        to={getProjectPath({
                          projectKey: key,
                          search: {
                            [BRANCH_SEARCH_PARAM]: { value: integration?.defaultBranch },
                            [MODE_SEARCH_PARAM]: { value: FILES_PROJECT_EDITOR_MODE },
                          },
                        })}
                      >
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
            }
          })
        }
      </TableRow>
    </>
  )
})

const columns: ReadonlyArray<Column> = [
  { key: 'favorite', label: '' },
  { key: 'name', label: 'Name' },
  { key: 'id', label: 'ID' },
]

interface Column {
  key: 'favorite' | 'name' | 'id'
  label: string
}
