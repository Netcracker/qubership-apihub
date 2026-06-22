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

import { AsyncApiOperationDiffsViewer } from '@apihub/components/AsyncApiOperationViewer/AsyncApiOperationDiffsViewer';
import type { Meta, StoryObj } from '@storybook/react';
import YAML from 'js-yaml';
import type { ComponentProps } from 'react';
import { TEST_DIFF_META_KEYS } from './async-api-diffs-suite/shared-test-data';
import { TEST_REFERENCE_NAME_PROPERTY } from './async-api-suite/shared-test-data';
import { prepareAsyncApiDiffsDocument } from './preprocess';

type StoryArgs = ComponentProps<typeof AsyncApiOperationDiffsViewer> & {
  beforeSourceText: string
  afterSourceText: string
}

const parseSourceText = (sourceText: string): Record<string, unknown> => {
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
    return {}
  }

  return parsedSource as Record<string, unknown>
}

// It's necessary because storybook doesn't render nested stories without this empty story
// eslint-disable-next-line storybook/story-exports
const meta = {
  title: 'Debug/Async Api Diffs Viewer',
  component: AsyncApiOperationDiffsViewer,
  argTypes: {
    mergedSource: {
      control: { disable: true },
      table: { disable: true }
    },
    beforeSourceText: {
      control: 'text'
    },
    afterSourceText: {
      control: 'text'
    },
    displayMode: {
      control: 'select',
      options: ['simple', 'detailed'],
      defaultValue: 'detailed'
    },
  },
  args: {
    beforeSourceText: `{
  "asyncapi": "3.0.0",
  "operations": {
    "send-operation-with-nothing": {
      "action": "send"
    }
  }
}`,
    afterSourceText: `{
  "asyncapi": "3.0.0",
  "operations": {
    "send-operation-with-nothing": {
      "action": "send",
      "description": "Test description"
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
    beforeSourceText: `{
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
    afterSourceText: `{
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
          "name": "Test Message",
          "description": "Test description"
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
    const { beforeSourceText, afterSourceText, ...viewerArgs } = args

    const beforeParsedSource = parseSourceText(beforeSourceText)
    const afterParsedSource = parseSourceText(afterSourceText)

    console.debug('Parsed before source:', beforeParsedSource)
    console.debug('Parsed after source:', afterParsedSource)

    console.log('TEST_DIFF_META_KEYS', TEST_DIFF_META_KEYS)

    return (
      <AsyncApiOperationDiffsViewer
        key={`${btoa(beforeSourceText)}-${btoa(afterSourceText)}`}
        {...viewerArgs}
        mergedSource={prepareAsyncApiDiffsDocument({
          beforeSource: beforeParsedSource,
          afterSource: afterParsedSource
        })}
        diffMetaKeys={TEST_DIFF_META_KEYS}
      />
    )
  }
}
