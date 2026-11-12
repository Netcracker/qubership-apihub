import type { Meta, StoryObj } from '@storybook/react-vite'
import { RolesTable } from '../components/RolesTable'
import { PERMISSIONS_LIST, ROLES_LIST } from './samples/roles-samples'

const meta: Meta<typeof RolesTable> = {
  title: 'Roles Table',
  component: RolesTable,
}

export default meta
type Story = StoryObj<typeof meta>

export const DefaultStory: Story = {
  name: 'Default',
  args: {
    permissions: PERMISSIONS_LIST,
    roles: ROLES_LIST,
  },
}
