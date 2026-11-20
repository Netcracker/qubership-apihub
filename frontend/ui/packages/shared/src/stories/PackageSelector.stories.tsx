import type { Meta, StoryObj } from '@storybook/react-vite'
import { fullHeight } from './commons/decorators'
import { PACKAGE_OPTIONS } from './samples/packge-samples'
import { PackageSelector } from '../components/PackageSelector'

const meta: Meta<typeof PackageSelector> = {
  title: 'Package Selector',
  component: PackageSelector,
  decorators: [fullHeight],
}

export default meta
type Story = StoryObj<typeof meta>

export const DefaultStory: Story = {
  name: 'Default',
  args: {
    key: 'package-selector',
    placeholder: 'select package',
    options: PACKAGE_OPTIONS,
    loading: false,
  },
}
