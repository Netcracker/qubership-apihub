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
import { memo } from 'react'
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import type { DropResult } from '@hello-pangea/dnd'
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import type { Roles } from '../types/roles'
import { DragIcon } from '../icons/DragIcon'

export type RolesListProps = {
  roles: Roles
  setRoles: (roles: Roles) => void
}
export const RolesList: FC<RolesListProps> = memo(({ roles, setRoles }) => {

  const reorder = (list: Roles, startIndex: number, endIndex: number): Roles => {
    const result = Array.from(list)
    const [removed] = result.splice(startIndex, 1)
    result.splice(endIndex, 0, removed)

    return result
  }

  const onDragEnd = (result: DropResult): void => {
    if (!result.destination) {
      return
    }
    if (roles[result.destination.index].readOnly) {
      return
    }

    const rolesOder = reorder(
      roles,
      result.source.index,
      result.destination.index,
    )

    setRoles(rolesOder)
  }

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: '44px' }}>
            </TableCell>
            <TableCell>
              <Typography noWrap variant="subtitle2" sx={{ pl: 0 }}>
                Role
              </Typography>
            </TableCell>
          </TableRow>
        </TableHead>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId={'droppable'}>
            {(provided) => (
              <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                {roles.map((role, index) => (
                  <Draggable key={role.key} draggableId={role.key} index={index} isDragDisabled={role.readOnly}>
                    {(provided) => (
                      <TableRow
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <TableCell key={index}>
                          {!role.readOnly && <DragIcon/>}
                        </TableCell>
                        <TableCell key={role.role}>
                          {role.role}
                        </TableCell>
                      </TableRow>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </TableBody>
            )}
          </Droppable>
        </DragDropContext>
      </Table>
    </TableContainer>
  )
})
