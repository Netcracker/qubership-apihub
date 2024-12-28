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
import { Box } from '@mui/material'
import type { PageTitleProps } from '../components/Titles/PageTitle'
import { PageTitle } from '../components/Titles/PageTitle'
import { BLUE_SECTION_COLOR } from './commons/placeholder-colors'
import { API_TYPE_REST } from '../entities/api-types'

export default {
  title: 'Titles',
} as Meta

const PageTitleFn: StoryFn<PageTitleProps> = (args) => <PageTitle {...args} />
export const PageTitleStory = PageTitleFn.bind({})

PageTitleStory.args = {
  title: 'Some Title',
  titleComponent: <Box sx={{ backgroundColor: BLUE_SECTION_COLOR }}>extra component</Box>,
  withApiSelector: true,
  apiType: API_TYPE_REST,
}
PageTitleStory.storyName = 'Page Title'
