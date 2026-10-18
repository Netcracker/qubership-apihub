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

import { Table, TableBody, TableContainer, TableHead, TableRow } from '@mui/material'
import { genericMemo } from '../utils/components'
import type { ReactElement } from 'react'

export type InfinityScrollableMatrixProps<H extends object, V extends object, C extends object> = {
  horizontalItems: ReadonlyArray<H>
  verticalItems: ReadonlyArray<V>
  matrix: C[][]
  verticalItemRender: (item: V) => ReactElement
  horizontalItemRender: (item: H) => ReactElement
  matrixCellRender: (key: string, item: C) => ReactElement
  firstColumnHeaderRender: () => ReactElement
  deleteColumnHeaderRender?: () => ReactElement
  deleteCellRender?: (key: string, item: V, rowItems: C[]) => ReactElement
}

function renderInfinityScrollableMatrix<H extends object, V extends object, C extends object>(props: InfinityScrollableMatrixProps<H, V, C>): ReactElement {
  const {
    verticalItems,
    horizontalItems,
    matrix,
    horizontalItemRender,
    verticalItemRender,
    matrixCellRender,
    firstColumnHeaderRender,
    deleteColumnHeaderRender,
    deleteCellRender,
  } = props

  return (
    <TableContainer>
      <Table
        sx={{
          '& .leftHeaderSticky': {
            position: 'sticky',
            left: 0,
            backgroundColor: '#FFFFFF',
            zIndex: 4,
          },
          '& .leftSticky': {
            position: 'sticky',
            left: 0,
            backgroundColor: '#FFFFFF',
            zIndex: 3,
          },
          '& .rightHeaderSticky': {
            backgroundColor: 'none',
          },
          '& .rightSticky': {
            backgroundColor: 'none',
          },
          '&:hover': {
            '& .rightHeaderSticky': {
              position: 'sticky',
              right: 0,
              backgroundColor: '#FFFFFF',
              zIndex: 4,
              opacity: 1,
            },
            '& .rightSticky': {
              position: 'sticky',
              right: 0,
              backgroundColor: '#FFFFFF',
              zIndex: 3,
              opacity: 1,
            },
          },
        }}
      >
        <TableHead>
          <TableRow>
            {firstColumnHeaderRender()}
            {horizontalItems.map((item) => horizontalItemRender(item))}
            {deleteColumnHeaderRender?.()}
          </TableRow>
        </TableHead>
        <TableBody>
          {verticalItems.map((item, indexRox) => (
            <TableRow
              key={`row-${indexRox}`}
              sx={{
                '&:hover': {
                  '& .MuiTableCell-root': {
                    backgroundColor: '#F1F3F5',
                  },
                },
              }}
            >
              {verticalItemRender(item)}
              {matrix[indexRox].map((matrixItem, indexColumn) => matrixCellRender(`cell-${indexRox}-${indexColumn}`, matrixItem))}
              {deleteCellRender?.(`delete-cell-${indexRox}`, item, matrix[indexRox])}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export const InfinityScrollableMatrix = genericMemo(renderInfinityScrollableMatrix)
