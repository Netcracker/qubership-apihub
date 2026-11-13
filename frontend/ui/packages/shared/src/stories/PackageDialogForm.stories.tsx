import type { Meta, StoryObj } from '@storybook/react-vite'
import { PackageDialogForm } from '../components/Forms/PackageDialogForm'
import { PACKAGE_KIND } from '../entities/packages'
import { GROUPS, WORKSPACES } from './samples/packages-sample'

const meta: Meta<typeof PackageDialogForm> = {
  component: PackageDialogForm,
}

export default meta
type Story = StoryObj<typeof meta>

export const DefaultStory: Story = {
  name: 'Default',
  args: {
    open: true,
    setOpen: () => null,
    onSubmit: () => null,
    packages: [...WORKSPACES, ...GROUPS],
    title: 'Some Package Form',
    kind: PACKAGE_KIND,
  },
}
