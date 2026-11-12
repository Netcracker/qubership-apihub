import type { Meta, StoryObj } from '@storybook/react-vite'
import { Table, TableRow } from '@mui/material'
import { TableCellSkeleton } from '../components/TableCellSkeleton'

const meta: Meta<typeof TableCellSkeleton> = {
  title: 'Table Cell Skeleton',
  component: TableCellSkeleton,
  decorators: [
    (Story) => (
      <Table sx={{ width: '900px' }}>
        <TableRow>
          <Story/>
        </TableRow>
      </Table>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const DefaultStory: Story = {
  name: 'Default',
}

export const MaxWidthStory: Story = {
  name: 'With maxWidth',
  args: {
    maxWidth: 200,
  },
}
