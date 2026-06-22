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

import { AsyncApiOperationViewer } from '@apihub/components/AsyncApiOperationViewer/AsyncApiOperationViewer';
import type { Meta, StoryObj } from '@storybook/react';
import YAML from 'js-yaml';
import type { ComponentProps } from 'react';
import { TEST_REFERENCE_NAME_PROPERTY } from './async-api-suite/shared-test-data';
import { prepareAsyncApiDocument } from './preprocess';

type StoryArgs = ComponentProps<typeof AsyncApiOperationViewer> & {
  sourceText: string
}

// It's necessary because storybook doesn't render nested stories without this empty story
// eslint-disable-next-line storybook/story-exports
const meta = {
  title: 'Debug/Async Api Viewer',
  component: AsyncApiOperationViewer,
  argTypes: {
    source: {
      control: { disable: true },
      table: { disable: true }
    },
    sourceText: {
      control: 'text'
    },
    displayMode: {
      control: 'select',
      options: ['simple', 'detailed'],
      defaultValue: 'detailed'
    },
  },
  args: {
    sourceText: `{
  "asyncapi": "3.0.0",
  "operations": {
    "send-operation-with-nothing": {
      "action": "send"
    }
  }
}`
  }
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>

export const Debug: Story = {
  args: {
    devMode: true,
    sourceText: `{
  "asyncapi": "3.0.0",
  "operations": {
    "test-operation": {
      "action": "send",
      "channel": { "$ref": "#/channels/test-channel" },
      "messages": [
        { "$ref": "#/channels/test-channel/messages/test-message" }
      ]
    }
  },
  "channels": {
    "test-channel": {
      "messages": {
        "test-message": {
          "name": "Test Message"
        }
      }
    }
  }
}`,
    operationKeys: {
      operationKey: 'test-operation',
      messageKey: 'test-message',
    },
    referenceNamePropertyKey: TEST_REFERENCE_NAME_PROPERTY
  },
  render: (args: StoryArgs) => {
    const { sourceText, ...viewerArgs } = args

    let parsedSource: unknown = undefined
    try {
      parsedSource = JSON.parse(sourceText)
    } catch (error) {
      console.error('Cannot parse JSON:', error)
      parsedSource = undefined
    }
    try {
      if (!parsedSource) {
        parsedSource = YAML.load(sourceText)
      }
    } catch (error) {
      console.error('Cannot parse YAML:', error)
      parsedSource = undefined
    }
    if (!parsedSource || typeof parsedSource !== 'object') {
      parsedSource = {}
    }

    console.debug('Parsed source:', parsedSource)

    return (
      <AsyncApiOperationViewer
        key={sourceText}
        {...viewerArgs}
        source={prepareAsyncApiDocument({ source: parsedSource })}
      />
    )
  }
}
