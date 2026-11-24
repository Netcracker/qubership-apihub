import type { Meta, StoryObj } from '@storybook/react-vite'
import { ROLES_LIST } from './samples/roles-samples'
import { DeleteRolePopup } from '../components/DeleteRoleDialog'

const meta: Meta<typeof DeleteRolePopup> = {
  title: 'Delete Role Dialog',
  component: DeleteRolePopup,
}

export default meta
type Story = StoryObj<typeof meta>

export const DefaultStory: Story = {
  name: 'Default',
  args: {
    open: true,
    detail: {
      role: ROLES_LIST[0],
    },
  },
}
