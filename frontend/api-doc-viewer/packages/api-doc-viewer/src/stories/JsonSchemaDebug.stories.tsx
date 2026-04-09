import type { Meta, StoryObj } from '@storybook/react';
import { JsonSchemaViewer } from '../components/JsonSchemaViewer/JsonSchemaViewer';
import { prepareJsonSchema, REQUEST_BODY_TARGET } from './preprocess';
import { ComponentProps } from 'react';
import YAML from 'js-yaml';
import { isObject } from '@netcracker/qubership-apihub-json-crawl';

type StoryArgs = ComponentProps<typeof JsonSchemaViewer> & {
  schemaText: string
  componentsText?: string
}

// It's necessary because storybook doesn't render nested stories without this empty story
// eslint-disable-next-line storybook/story-exports
const meta = {
  title: 'Debug/Json Schema Viewer',
  component: JsonSchemaViewer,
  parameters: {},
  argTypes: {
    schemaText: {
      control: 'text',
    },
    componentsText: {
      control: 'text',
    },
    schema: {
      control: { disable: true },
      table: { disable: true },
    }
  },
  args: {
    schemaText: '',
    componentsText: '',
  }
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>

export const Debug: Story = {
  args: {
    schemaText: '',
    componentsText: '',
  },
  render: (args) => {
    const { schemaText, componentsText, ...viewerArgs } = args

    const parsedSchema = parseJsonOrYaml(schemaText)
    const parsedComponents = componentsText ? parseJsonOrYaml(componentsText) : undefined

    const schema = prepareJsonSchema({
      schema: parsedSchema,
      additionalComponents: isObject(parsedComponents) ? parsedComponents : undefined,
      target: REQUEST_BODY_TARGET,
    })

    console.log(schemaText)
    console.debug('Prepared schema:', schema)

    return <JsonSchemaViewer {...viewerArgs} schema={schema} />
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
      parsed = YAML.load(text)
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
