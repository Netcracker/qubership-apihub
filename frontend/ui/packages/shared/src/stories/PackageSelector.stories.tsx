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
