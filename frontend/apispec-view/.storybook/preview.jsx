import * as React from 'react'
import { ArgsTable, Description, Primary, PRIMARY_STORY, Subtitle, Title } from '@storybook/addon-docs/blocks'
import customTheme from './theme'

export const parameters = {
  docs: {
    page: () => (
      <>
        <Title />
        <Subtitle />
        <Description />
        <Primary />
        <ArgsTable story={PRIMARY_STORY} />
      </>
    ),
    theme: customTheme,
  },
  options: {
    storySort: {
      order: ['Public', 'Internal'],
    },
  },
};
export const tags = ['autodocs']
