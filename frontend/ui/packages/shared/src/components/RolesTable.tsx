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
import { memo, useState } from 'react'
import {
  Box,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import type { Permission } from '../types/permissions'
import type { Role } from '../types/roles'
import { DoneIcon } from '../icons/DoneIcon'
import { MinusIcon } from '../icons/MinusIcon'
import { EditIcon } from '../icons/EditIcon'
import { DISABLED_BUTTON_COLOR, ENABLED_BUTTON_COLOR } from '../entities/operation-groups'
import { DeleteIcon } from '../icons/DeleteIcon'

const HOVERABLE_COLUMN_OFFSET = 2

export type RolesTableProps = {
  permissions: ReadonlyArray<Permission>
  roles: ReadonlyArray<Role>
  onDelete?: (role: Role) => void
  onEdit?: (role: Role) => void
}

export const RolesTable: FC<RolesTableProps> = memo<RolesTableProps>(({ permissions, roles, onDelete, onEdit }) => {
  const [colHoverNth, setColHoverNth] = useState('')

  const handleColumnHover = (column: number): void => setColHoverNth(`${column + HOVERABLE_COLUMN_OFFSET}`)
  const cancelColumnHover = (): void => setColHoverNth('')

  return (
    <TableContainer
      sx={{
        height: 'unset', // overrides global '100%' height to show the horizontal scroll
        '& .sticky': {
          position: 'sticky',
          left: 0,
          backgroundColor: '#FFFFFF',
          zIndex: 3, // makes the first column background higher than checkboxes while horizontal scrolling
        },
      }}
    >
      <Table
        sx={{
          '& .MuiTableRow-root:hover': {
            backgroundColor: '#FFFFFF',
          },
          [`th:nth-of-type(${colHoverNth}), td:nth-of-type(${colHoverNth}), tbody tr:hover`]: {
            backgroundColor: '#F8F9FA',
          },
          [`td:nth-of-type(${colHoverNth}) .hoverable2`]: {
            visibility: 'visible',
          },
        }}
        onMouseOut={cancelColumnHover}
      >
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: '291px', px: '12px' }} className="sticky">
              <Typography noWrap variant="subtitle2" sx={{ pl: 0 }}>
                Permission
              </Typography>
            </TableCell>
            {roles.map(({ key, role }, index) => (
              <TableCell
                key={key}
                sx={{ width: '121px', textAlign: 'center', position: 'relative' }}
                onMouseOver={() => handleColumnHover(index)}
              >
                <Typography noWrap variant="subtitle2" sx={{ pl: 0 }}>
                  {role}
                </Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {permissions.map(({ permission, name }) => (
            <TableRow key={permission}>
              <TableCell key={permission} sx={{ width: '291px', px: '12px' }} className="sticky" data-testid={`Cell-${permission}`}>
                {name}
              </TableCell>
              {roles.map((role, index) => {
                const { key, permissions } = role
                return (
                  <TableCell
                    onMouseOver={() => handleColumnHover(index)}
                    key={key}
                    sx={{ textAlign: 'center' }}
                    data-testid={`Cell-${role.role}`}
                  >
                    <Box display="flex" alignItems="center" justifyContent="center">
                      {permissions.includes(permission)
                        ? <DoneIcon color="#00BB5B"/>
                        : <MinusIcon color="#626D82"/>
                      }
                    </Box>
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
          {onEdit && onDelete && <TableRow>
            <TableCell sx={{ width: '291px', px: '12px' }} className="sticky" data-testid="ActionsRow"></TableCell>
            {roles.map((role, index) => {
              const { key, readOnly } = role
              return (
                <TableCell
                  onMouseOver={() => handleColumnHover(index)}
                  key={key}
                  sx={{ textAlign: 'center' }}
                  data-testid={`Cell-${role.role}`}
                >
                  <Box display="flex" justifyContent="center" gap="24px" className="hoverable2" visibility="hidden">
                    <Tooltip
                      title={`${role.role} role cannot be edited`}
                      disableHoverListener={!readOnly}
                      disableFocusListener={!readOnly}
                      placement="right"
                    >
                      <Box>
                        <IconButton
                          sx={{ p: 0 }}
                          disabled={readOnly}
                          onClick={() => onEdit(role)}
                          data-testid="EditButton"
                        >
                          <EditIcon color={readOnly ? DISABLED_BUTTON_COLOR : ENABLED_BUTTON_COLOR}/>
                        </IconButton>
                      </Box>
                    </Tooltip>
                    <Tooltip
                      title={`${role.role} role cannot be deleted`}
                      disableHoverListener={!readOnly}
                      disableFocusListener={!readOnly}
                      placement="right"
                    >
                      <Box>
                        <IconButton
                          sx={{ p: 0 }}
                          disabled={readOnly}
                          onClick={() => onDelete(role)}
                          data-testid="EditButton"
                        >
                          <DeleteIcon color={readOnly ? DISABLED_BUTTON_COLOR : ENABLED_BUTTON_COLOR}/>
                        </IconButton>
                      </Box>
                    </Tooltip>
                  </Box>
                </TableCell>
              )
            })}
          </TableRow>}
        </TableBody>
      </Table>
    </TableContainer>
  )
})
