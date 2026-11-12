import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactElement } from 'react'
import { useArgs } from 'storybook/preview-api'
import { operationTags } from './samples/tags-samples'
import type { SidebarWithTagsProps } from '../components/SidebarWithTags/SidebarWithTags'
import { SidebarWithTags } from '../components/SidebarWithTags/SidebarWithTags'

const meta: Meta<typeof SidebarWithTags> = {
  title: 'Sidebar With Tags',
  component: SidebarWithTags,
}

export default meta
type Story = StoryObj<typeof meta>

const StoryComponent = (args: SidebarWithTagsProps): ReactElement => {
  const [{ tags }, updateArgs] = useArgs<{ tags: string[] }>()

  return (
    <SidebarWithTags
      {...args}
      onSearch={value => {
        updateArgs({
          tags: value ? tags.filter(tag => tag.toLowerCase().includes(value.toLowerCase())) : operationTags,
        })
      }}
    />
  )
}

export const DefaultStory: Story = {
  name: 'Default',
  args: {
    tags: operationTags,
    areTagsLoading: false,
  },
  render: StoryComponent,
}
