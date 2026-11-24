import type { Meta, StoryFn } from '@storybook/react-vite'
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
