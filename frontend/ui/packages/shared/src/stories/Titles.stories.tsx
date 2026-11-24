import type { Meta, StoryFn } from '@storybook/react-vite'
import React from 'react'
import { Box } from '@mui/material'
import type { PageTitleProps } from '../components/Titles/PageTitle'
import { PageTitle } from '../components/Titles/PageTitle'
import { BLUE_SECTION_COLOR } from './commons/placeholder-colors'
import { API_TYPE_GRAPHQL, API_TYPE_REST } from '../entities/api-types'

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
  allowedApiTypes: [API_TYPE_REST, API_TYPE_GRAPHQL],
}
PageTitleStory.storyName = 'Page Title'
