import { JsoViewer } from '@apihub/components/JsoViewer/JsoViewer';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { parse } from 'yaml';
import { ComponentProps } from 'react';
import { parseYamlSource } from './utils/parse-yaml-source';

type StoryArgs = ComponentProps<typeof JsoViewer> & {
  jsoText: string
  componentsText?: string
}

// It's necessary because storybook doesn't render nested stories without this empty story
// eslint-disable-next-line storybook/story-exports
const meta = {
  title: 'Debug/Jso Viewer',
  component: JsoViewer,
  parameters: {},
  argTypes: {
    jsoText: {
      control: 'text',
    },
    componentsText: {
      control: 'text',
    },
    source: {
      control: { disable: true },
      table: { disable: true },
    }
  },
  args: {
    jsoText: '',
  }
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>

export const Debug: Story = {
  args: {
    jsoText: '',
  },
  render: (args) => {
    const { jsoText, ...viewerArgs } = args

    const parsedJso = parseYamlSource(jsoText)

    console.log(jsoText)
    console.debug('Prepared JSO:', parsedJso)

    return <JsoViewer {...viewerArgs} source={parsedJso as object | null} initialLevel={1} />
  }
}

