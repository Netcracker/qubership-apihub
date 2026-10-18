import { JsonSchemaViewer } from '@apihub/components/JsonSchemaViewer/JsonSchemaViewer';
import { isObject } from '@netcracker/qubership-apihub-json-crawl';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComponentProps } from 'react';
import { prepareJsonSchema, REQUEST_BODY_TARGET } from './preprocess';
import { parseYamlSource } from './utils/parse-yaml-source';

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

    const parsedSchema = parseYamlSource(schemaText)
    const parsedComponents = componentsText ? parseYamlSource(componentsText) : undefined

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

