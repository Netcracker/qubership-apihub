import * as React from 'react'
import { ArgsTable, Description, Primary, PRIMARY_STORY, Subtitle, Title } from '@storybook/addon-docs/blocks'
import customTheme from './theme'

import './google-fonts.css'

import { subscribeTheme, Provider as MosaicProvider } from '@stoplight/mosaic';
import { PersistenceContextProvider, Styled } from '../src';
import '../src/styles.css';

const ThemeProvider = (Story, context) => {
  const theme = context.globals.theme;
  React.useEffect(() => {
    subscribeTheme({ mode: theme === 'dark' ? 'dark' : 'light' });
  }, [subscribeTheme, theme]);
  return <Story {...context} />;
};

const MosaicProviderDecorator = Story => (
  <MosaicProvider style={{height: "100vh"}}>
    <Story />
  </MosaicProvider>
);

const PersistenceBoundaryDecorator = Story => (
  <PersistenceContextProvider>
    <Story />
  </PersistenceContextProvider>
);

const StyledDecorator = Story => (
  <Styled>
    <Story />
  </Styled>
);

export const decorators = [ThemeProvider, MosaicProviderDecorator, PersistenceBoundaryDecorator, StyledDecorator];


export const globalTypes = {
  theme: {
    name: 'Theme',
    description: 'Global theme for components',
    defaultValue: 'light',
    toolbar: {
      icon: 'circlehollow',
      items: ['light', 'dark'],
    },
  },
}

export const parameters = {
  docs: {
    page: () => (
      <>
        <Title/>
        <Subtitle/>
        <Description/>
        <Primary/>
        <ArgsTable story={PRIMARY_STORY}/>
      </>
    ),
    theme: customTheme,
  },
  options: {
    storySort: {
      order: ['Public', 'Internal'],
    },
  },
}
