import type { Meta, StoryObj } from '@storybook/react-vite'
import { DeleteFilePopup } from '../../components/FileTableUpload/DeleteFileDialog'

const meta: Meta<typeof DeleteFilePopup> = {
  title: 'File Table Upload/Delete File Dialog',
  component: DeleteFilePopup,
}

export default meta
type Story = StoryObj<typeof meta>

export const DefaultStory: Story = {
  name: 'Default',
  args: {
    open: true,
    setOpen: () => undefined,
    detail: {
      file: {
        name: 'Test File',
      } as File,
      onConfirm: () => undefined,
    },
  },
}

export const EndpointDeleteStory: Story = {
  name: 'Endpoint delete',
  args: {
    open: true,
    setOpen: () => undefined,
    detail: {
      title: 'Delete /mcp/example?',
      message: 'Deleting this MCP endpoint will permanently remove the endpoint and all associated artifacts.',
      onConfirm: () => undefined,
    },
  },
}
