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
import type { ErrorPageProps } from '../components/ErrorPage'
import { ErrorPage } from '../components/ErrorPage'
import { fullHeight } from './commons/decorators'
import type { PackageRedirectPageProps } from '../components/PackageRedirectPage'
import { PackageRedirectPage } from '../components/PackageRedirectPage'

export default {
  title: 'Simple Pages',
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [fullHeight],
} as Meta

const ErrorPageFn: StoryFn<ErrorPageProps> = (args) => <ErrorPage {...args} />
export const ErrorPageStory = ErrorPageFn.bind({})

ErrorPageStory.args = {
  title: 'Some Error Title',
  message: 'Message with details about error.',
  homePath: '/expamleurl',
}
ErrorPageStory.storyName = 'Error Page'

const PackageRedirectPageFn: StoryFn<PackageRedirectPageProps> = (args) => <PackageRedirectPage {...args} />
export const PackageRedirectPageStory = PackageRedirectPageFn.bind({})

PackageRedirectPageStory.args = {
  newId: '<New package ID>',
  href: '/sameurl/newid',
}
PackageRedirectPageStory.storyName = 'Package Redirect Page'

