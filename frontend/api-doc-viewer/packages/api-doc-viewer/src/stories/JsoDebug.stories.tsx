import { JsoViewer } from '@apihub/components/JsoViewer/JsoViewer';
import type { Meta, StoryObj } from '@storybook/react';
import { parse } from 'yaml';
import { ComponentProps } from 'react';

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

    const parsedJso = parseJsonOrYaml(jsoText)

    console.log(jsoText)
    console.debug('Prepared JSO:', parsedJso)

    return <JsoViewer {...viewerArgs} source={parsedJso as object | null} initialLevel={1} />
  }
}

function parseJsonOrYaml(text: string): unknown {
  let parsed: unknown = undefined
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    console.error('Cannot parse JSON:', error)
    parsed = undefined
  }
  try {
    if (!parsed) {
      parsed = parse(text)
    }
  } catch (error) {
    console.error('Cannot parse YAML:', error)
    parsed = undefined
  }
  if (!parsed || typeof parsed !== 'object') {
    parsed = {}
  }
  console.debug('Parsed source:', parsed)
  return parsed
}
