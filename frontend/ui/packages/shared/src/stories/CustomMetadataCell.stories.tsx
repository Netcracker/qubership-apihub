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
import { CustomMetadataCell } from '../components/CustomMetadataCell'
import { metadata } from './samples/metadata-samples'

const meta: Meta<typeof CustomMetadataCell> = {
  title: 'Custom Metadata Cell',
  component: CustomMetadataCell,
}

export default meta
type Story = StoryObj<typeof meta>

export const DefaultStory: Story = {
  name: 'Default',
  args: {
    metaData: metadata,
    textFilter: '',
  },
}

export const WithTextFilterStory: Story = {
  name: 'With Text Filter',
  args: {
    metaData: metadata,
    textFilter: 'x-custom8: test',
  },
}
