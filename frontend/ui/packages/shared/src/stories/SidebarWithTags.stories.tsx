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

import type { Meta, StoryObj } from '@storybook/react'
import type { ReactElement } from 'react'
import { useArgs } from '@storybook/preview-api'
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
