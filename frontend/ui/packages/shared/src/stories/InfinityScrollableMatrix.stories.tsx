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

import type { Meta, StoryFn } from '@storybook/react'
import type { InfinityScrollableMatrixProps } from '../components/InfinityScrollableMatrix'
import { InfinityScrollableMatrix } from '../components/InfinityScrollableMatrix'
import { TableCell, Typography } from '@mui/material'
import * as React from 'react'
import type { HorizontalItem, MatrixItem, VerticalItem } from './samples/matrix-samples'
import { HORIZONTAL_ITEMS, MATRIX, VERTICAL_ITEMS } from './samples/matrix-samples'

export default {
  title: 'Infinity Scrollable Matrix',
} as Meta

const InfinityScrollableMatrixFn: StoryFn<InfinityScrollableMatrixProps<HorizontalItem, VerticalItem, MatrixItem>> =
  (args) => (
    <>
      <InfinityScrollableMatrix {...args}/>
    </>
  )

export const InfinityScrollableMatrixStory = InfinityScrollableMatrixFn.bind({})

InfinityScrollableMatrixStory.args = {
  horizontalItems: HORIZONTAL_ITEMS,
  verticalItems: VERTICAL_ITEMS,
  matrix: MATRIX,
  firstColumnHeaderRender: () => (
    <TableCell>
      <Typography noWrap variant="subtitle2" sx={{ pl: 0 }}>
        User
      </Typography>
    </TableCell>
  ),
  horizontalItemRender: (item) => (
    <TableCell
      sx={{ width: '100px' }}
      key={item.title}
    >
      <Typography noWrap variant="subtitle2" sx={{ pl: 0 }}>
        {item.title}
      </Typography>
    </TableCell>
  ),
  verticalItemRender: (item) => (
    <TableCell
      key={item.name}
    >
      {item.name}
    </TableCell>
  ),
  matrixCellRender: (key) => (
    <TableCell key={key}>
      {key}
    </TableCell>
  ),
}
