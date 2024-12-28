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

import Box from '@mui/material/Box'
import React from 'react'
import type { LayoutWithToolbarProps } from '../components/PageLayouts/LayoutWithToolbar'
import { LayoutWithToolbar } from '../components/PageLayouts/LayoutWithToolbar'
import { fullHeight } from './commons/decorators'
import { LARGE_TOOLBAR_SIZE, Toolbar } from '../components/Toolbar'
import type { LayoutWithTabsProps } from '../components/PageLayouts/LayoutWithTabs'
import { LayoutWithTabs } from '../components/PageLayouts/LayoutWithTabs'
import type { LayoutWithSidebarProps } from '../components/PageLayouts/LayoutWithSidebar'
import { LayoutWithSidebar } from '../components/PageLayouts/LayoutWithSidebar'
import type { VersionOperationsLayoutProps } from '../components/PageLayouts/RichFiltersLayout'
import { RichFiltersLayout } from '../components/PageLayouts/RichFiltersLayout'
import {
  BROWN_SECTION_COLOR,
  GREEN_SECTION_COLOR,
  ORANGE_SECTION_COLOR,
  PURPLE_SECTION_COLOR,
  RED_SECTION_COLOR,
} from './commons/placeholder-colors'

const WITH_TABS_COLOR = '#E56E94'
const WITH_TOOLBAR_COLOR = '#C2E5D3'
const WITH_SIDEBAR_COLOR = '#ADD8E6'

export default {
  title: 'Page Layouts',
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [fullHeight],
} as Meta

const LayoutWithToolbarFn: StoryFn<LayoutWithToolbarProps> = (args) => <LayoutWithToolbar {...args} />
export const LayoutWithToolbarStory = LayoutWithToolbarFn.bind({})
const withToolbarBorder = `solid ${WITH_TOOLBAR_COLOR}`

LayoutWithToolbarStory.args = {
  toolbar: (
    <Box sx={{ border: withToolbarBorder }}>
      <Toolbar
        size={LARGE_TOOLBAR_SIZE}
        header={<Box sx={{ border: withToolbarBorder }}>This is a toolbar header</Box>}
        action={<Box sx={{ border: withToolbarBorder }}>This is a toolbar action</Box>}
      />
    </Box>
  ),
  body: (
    <Box
      sx={{ height: '100%', backgroundColor: WITH_TOOLBAR_COLOR, pt: '200px' }}
      textAlign="center"
    >
      This is a body
    </Box>
  ),
}
LayoutWithToolbarStory.storyName = 'Layout With Toolbar'

const LayoutWithTabsFn: StoryFn<LayoutWithTabsProps> = (args) => <LayoutWithTabs {...args} />
export const LayoutWithTabsStory = LayoutWithTabsFn.bind({})
LayoutWithTabsStory.args = {
  tabs: (
    <Box
      sx={{ height: '100%', border: `solid ${WITH_TABS_COLOR}` }}
      textAlign="center"
      pt="30%"
    >
      This is a tabs
    </Box>
  ),
  body: (
    <Box
      sx={{ height: '100%', backgroundColor: WITH_TABS_COLOR, pt: '200px' }}
      textAlign="center"
    >
      This is a body
    </Box>
  ),
}
LayoutWithTabsStory.storyName = 'Layout With Tabs'

const LayoutWithSidebarFn: StoryFn<LayoutWithSidebarProps> = (args) => <LayoutWithSidebar {...args} />
export const LayoutWithSidebarStory = LayoutWithSidebarFn.bind({})
const withSidbarBorder = `solid ${WITH_SIDEBAR_COLOR}`

LayoutWithSidebarStory.args = {
  sidebar: (
    <Box
      sx={{ height: '100%', border: withSidbarBorder }}
      textAlign="center"
    >
      This is a sidebar
    </Box>
  ),
  body: (
    <Box
      sx={{ height: '100%', backgroundColor: WITH_SIDEBAR_COLOR, pt: '200px' }}
      textAlign="center"
    >
      This is a body
    </Box>
  ),
  header: <Box sx={{ border: withSidbarBorder }}>This is a header</Box>,
  action: <Box sx={{ border: withSidbarBorder }}>This is an action</Box>,
}
LayoutWithSidebarStory.storyName = 'Layout With Sidebar'

const RichFiltersLayoutFn: StoryFn<VersionOperationsLayoutProps> = (args) => <RichFiltersLayout {...args} />
export const RichFiltersLayoutStory = RichFiltersLayoutFn.bind({})

RichFiltersLayoutStory.args = {
  title: <Box sx={{ backgroundColor: GREEN_SECTION_COLOR }}>This is a Title</Box>,
  viewMode: 'option-1',
  additionalActions: <Box sx={{ backgroundColor: ORANGE_SECTION_COLOR }}>Additional Actions</Box>,
  viewOptions: [{
    icon: <Box width="20px" height="20px" sx={{ backgroundColor: GREEN_SECTION_COLOR }}/>,
    value: 'option-1',
    tooltip: 'View 1',
  }, {
    icon: <Box width="20px" height="20px" sx={{ backgroundColor: BROWN_SECTION_COLOR }}/>,
    value: 'option-2',
    tooltip: 'View 2',
  }],
  searchPlaceholder: 'Search Placeholder',
  exportButton: <Box sx={{ backgroundColor: PURPLE_SECTION_COLOR }}>Export button here</Box>,
  body: (
    <Box
      sx={{ height: '100%', backgroundColor: WITH_SIDEBAR_COLOR }}
      textAlign="center"
    >
      This is a body
    </Box>
  ),
  filters: <Box sx={{ height: '100%', backgroundColor: RED_SECTION_COLOR }}>
    These are rich filters
  </Box>,
  hideFiltersPanel: true,
}
RichFiltersLayoutStory.storyName = 'Rich Filters Layout'

