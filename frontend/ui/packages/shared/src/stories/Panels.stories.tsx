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
import type { PropsWithChildren } from 'react'
import React from 'react'
import Box from '@mui/material/Box'
import { fullHeight } from './commons/decorators'
import type { SidebarPanelProps } from '../components/Panels/SidebarPanel'
import { SidebarPanel } from '../components/Panels/SidebarPanel'
import { BLUE_SECTION_COLOR, GREEN_SECTION_COLOR, RED_SECTION_COLOR } from './commons/placeholder-colors'
import { ListBox } from '../components/Panels/ListBox'
import type { TabsPanelProps } from '../components/Panels/TabsPanel'
import { TabsPanel } from '../components/Panels/TabsPanel'

export default {
  title: 'Panels',
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [fullHeight],
} as Meta

const SidebarPanelFn: StoryFn<SidebarPanelProps> = (args) => <SidebarPanel {...args} />
export const SidebarPanelStory = SidebarPanelFn.bind({})

SidebarPanelStory.args = {
  header: <Box sx={{ backgroundColor: RED_SECTION_COLOR }}>This is a header</Box>,
  body: <Box sx={{ backgroundColor: GREEN_SECTION_COLOR }}>This is a body</Box>,
  headerFullWidth: true,
  withDivider: true,
}
SidebarPanelStory.storyName = 'Sidebar Panel'

const ListBoxFn: StoryFn<PropsWithChildren> = (args) => <ListBox {...args} />
export const ListBoxStory = ListBoxFn.bind({})

ListBoxStory.args = {
  children: <Box sx={{ backgroundColor: BLUE_SECTION_COLOR }} height="100%">This is a list content</Box>,
}
ListBoxStory.storyName = 'List Box'

type TabKeys = 'tab-1' | 'tab-2' | 'tab-3'

const TabsPanelFn: StoryFn<TabsPanelProps<TabKeys>> = (args) => <TabsPanel {...args} />
export const TabsPanelStory = TabsPanelFn.bind({})

TabsPanelStory.args = {
  tabs: [{
    key: 'tab-1',
    name: 'Tab Name 1',
    info: <Box sx={{ backgroundColor: GREEN_SECTION_COLOR, width: '20px', height: '20px' }}/>,
  }, {
    key: 'tab-2',
    name: 'Tab Name 2',
    isLoading: true,
  }, {
    key: 'tab-3',
    name: 'Tab Name 3',
  }],
  panels: [{
    key: 'tab-1',
    content: <Box sx={{ backgroundColor: GREEN_SECTION_COLOR, width: '100%', height: '100%' }}>Tab 1 Content</Box>,
  }, {
    key: 'tab-2',
    content: <Box sx={{ backgroundColor: RED_SECTION_COLOR, width: '100%', height: '500px' }}>Tab 2 Content</Box>,
  }, {
    key: 'tab-3',
    content: <Box sx={{ backgroundColor: BLUE_SECTION_COLOR, width: '100%', height: '2000px' }}>Tab 3 Content with
      scroll</Box>,
  }],
  activeTab: 'tab-1',
  separator: false,
}
TabsPanelStory.storyName = 'TabsPanel'
