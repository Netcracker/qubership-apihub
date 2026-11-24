import type { Meta, StoryFn } from '@storybook/react-vite'
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

