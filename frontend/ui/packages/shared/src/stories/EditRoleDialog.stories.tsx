import type { Meta, StoryObj } from '@storybook/react-vite'
import { PERMISSIONS_LIST, ROLES_LIST } from './samples/roles-samples'
import { EditRolePopup } from '../components/EditRoleDialog'

const meta: Meta<typeof EditRolePopup> = {
  title: 'Edit Role Dialog',
  component: EditRolePopup,
}

export default meta
type Story = StoryObj<typeof meta>

export const CreateStory: Story = {
  name: 'Create',
  args: {
    open: true,
    detail: {
      permissions: PERMISSIONS_LIST,
      isRoleUnique: (roleName: string) => !ROLES_LIST?.some(({ role }) => role.toLowerCase() === roleName.toLowerCase()),
    },
  },
}

export const EditStory: Story = {
  name: 'Edit',
  args: {
    open: true,
    detail: {
      permissions: PERMISSIONS_LIST,
      role: ROLES_LIST[3],
    },
  },
}
