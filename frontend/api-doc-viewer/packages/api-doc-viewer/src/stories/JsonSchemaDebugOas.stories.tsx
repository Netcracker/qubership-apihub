import type { Meta, StoryObj } from '@storybook/react';
import { ComponentProps } from 'react';
import { parse } from 'yaml';
import { JsonSchemaViewer } from '../components/JsonSchemaViewer/JsonSchemaViewer';
import { prepareJsonSchemaFromOAS } from './preprocess';

type StoryArgs = ComponentProps<typeof JsonSchemaViewer> & {
  oasText: string // OAS 3.0 or OAS 3.1, JSON or YAML
  refToSchema: string // #/components/schemas/JsonOffering
}

// It's necessary because storybook doesn't render nested stories without this empty story
// eslint-disable-next-line storybook/story-exports
const meta = {
  title: 'Debug/Json Schema Viewer (OAS)',
  component: JsonSchemaViewer,
  parameters: {},
  argTypes: {
    oasText: {
      control: 'text',
    },
    refToSchema: {
      control: 'text',
    },
  },
  args: {
    oasText: '',
    refToSchema: '',
  }
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>

export const DebugOas30: Story = {
  args: {
    oasText: '',
    refToSchema: '',
  },
  render: (args) => {
    const { oasText, refToSchema, ...viewerArgs } = args

    const parsedOas = parseJsonOrYaml(oasText)

    const schema = prepareJsonSchemaFromOAS({
      source: parsedOas,
      path: refToSchema.split('/').slice(1),
    })

    console.log('OAS:', oasText)
    console.log('Ref to schema:', refToSchema)
    console.debug('Prepared schema:', schema)

    return <JsonSchemaViewer {...viewerArgs} schema={schema} />
  }
}
DebugOas30.storyName = 'Debug OAS 3.0';

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
