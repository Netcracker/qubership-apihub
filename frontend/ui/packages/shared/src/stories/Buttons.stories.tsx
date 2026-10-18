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

import type { Meta, StoryFn } from '@storybook/react'
import React from 'react'
import { Button, MenuItem } from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import type { MenuButtonProps } from '../components/Buttons/MenuButton'
import { MenuButton } from '../components/Buttons/MenuButton'
import type { FilterButtonProps } from '../components/Buttons/FilterButton'
import { FilterButton } from '../components/Buttons/FilterButton'
import type { MultiButtonProps } from '../components/Buttons/MultiButton'
import { MultiButton } from '../components/Buttons/MultiButton'
import type { ExportMenuButtonProps } from '../components/Buttons/ExportMenuButton'
import { ExportMenuButton } from '../components/Buttons/ExportMenuButton'

export default {
  title: 'Buttons',
  parameters: {
    layout: 'centered',
  },
} as Meta

const ExportMenuButtonFn: StoryFn<ExportMenuButtonProps> = (args) => <ExportMenuButton {...args} />
export const ExportMenuButtonStory = ExportMenuButtonFn.bind({})

ExportMenuButtonStory.args = {
  title: 'Some Title',
  disabled: false,
  allDownloadText: 'Export All Button Label',
  filteredDownloadText: 'Export Filtered Button Label',
}
ExportMenuButtonStory.storyName = 'Export Menu Button'

const FilterButtonFn: StoryFn<FilterButtonProps> = (args) => <FilterButton {...args} />
export const FilterButtonStory = FilterButtonFn.bind({})

FilterButtonStory.args = {
  selected: true,
  showBadge: true,
}
FilterButtonStory.storyName = 'Filter Button'

const MenuButtonFn: StoryFn<MenuButtonProps> = (args) => <MenuButton {...args} />
export const MenuButtonStory = MenuButtonFn.bind({})

MenuButtonStory.argTypes = {
  alignItems: {
    control: { type: 'radio' },
    options: ['normal', 'center'],
  },
}

MenuButtonStory.args = {
  title: 'Title',
  icon: <MoreVertIcon/>,
  alignItems: 'normal',
  children: [
    <MenuItem>Option 1</MenuItem>,
    <MenuItem>Option 2</MenuItem>,
    <MenuItem>Option 3</MenuItem>,
  ],

}
MenuButtonStory.storyName = 'Menu Button'

const MultiButtonFn: StoryFn<MultiButtonProps> = (args) => <MultiButton {...args} />
export const MultiButtonStory = MultiButtonFn.bind({})

MultiButtonStory.args = {
  primary: <Button>Primary Component</Button>,
  secondary: <Button>Secondary Component</Button>,
}
MultiButtonStory.storyName = 'Multi Button'
