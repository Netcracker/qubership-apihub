// It's necessary because storybook doesn't render nested stories without this empty story

import { AsyncApiOperationViewer } from "@apihub/components/AsyncApiOperationViewer/AsyncApiOperationViewer";
import type { Meta, StoryObj } from '@storybook/react';
import { EXTENSIONS, TEST_REFERENCE_NAME_PROPERTY } from "./shared-test-data";
import { prepareAsyncApiDocument } from "../preprocess";

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: 'Async API Suite/Message Operation',
  component: AsyncApiOperationViewer,
  parameters: {},
  argTypes: {
    source: {
      control: 'object'
    }
  },
  args: {
    source: {}
  }
} satisfies Meta<typeof AsyncApiOperationViewer>;

export default meta;

type Story = StoryObj<typeof meta>

const OPERATION_KEY = 'OperationID';
const CHANNEL_KEY = 'ChannelID';
const MESSAGE_KEY = 'MessageID';

type OperationContent = {
  title?: string;
  description?: string;
  summary?: string;
  bindings?: Record<string, unknown>;
  [key: string]: unknown;
};

type SourceOptions = {
  operation: OperationContent;
  operationType?: 'send' | 'receive';
};

const createSource = ({ operation, operationType = 'send' }: SourceOptions) => ({
  asyncapi: "3.0.0",
  operations: {
    [OPERATION_KEY]: {
      action: operationType,
      channel: { $ref: `#/channels/${CHANNEL_KEY}` },
      messages: [{ $ref: `#/channels/${CHANNEL_KEY}/messages/${MESSAGE_KEY}` }],
      ...operation,
    }
  },
  channels: {
    [CHANNEL_KEY]: {
      messages: {
        [MESSAGE_KEY]: {
          name: "Message Name",
        }
      },
    }
  }
});

const createStory = (source: ReturnType<typeof createSource>): Story => ({
  args: {
    devMode: true,
    source: prepareAsyncApiDocument({ source }),
    operationKeys: {
      operationKey: OPERATION_KEY,
      messageKey: MESSAGE_KEY,
    },
    referenceNamePropertyKey: TEST_REFERENCE_NAME_PROPERTY,
  }
});

export const OperationId: Story = createStory(createSource({
  operation: {},
}));

export const Title: Story = createStory(createSource({
  operation: {
    title: "Operation Title",
  },
}));

export const Description: Story = createStory(createSource({
  operation: {
    description: "Operation description",
  },
}));

export const Summary: Story = createStory(createSource({
  operation: {
    summary: "Operation summary",
  },
}));

export const Extensions: Story = createStory(createSource({
  operation: {
    ...EXTENSIONS,
  },
}));

export const BindingsOneOption: Story = createStory(createSource({
  operation: {
    bindings: {
      kafka: {
        bindingVersion: "0.5.0",
        topic: "events.operation.created",
        clientId: "api-doc-viewer-client",
      }
    },
  },
}));

export const BindingsTwoOptionsSelectedFirst: Story = createStory(createSource({
  operation: {
    bindings: {
      kafka: {
        bindingVersion: "0.5.0",
        topic: "events.operation.first",
      },
      mqtt: {
        bindingVersion: "0.2.0",
        clientId: "mqtt-client-01",
      },
    },
  },
}));

export const BindingsTwoOptionsSelectedSecond: Story = createStory(createSource({
  operation: {
    bindings: {
      kafka: {
        bindingVersion: "0.5.0",
        topic: "events.operation.second",
      },
      mqtt: {
        bindingVersion: "0.2.0",
        clientId: "mqtt-client-02",
      },
    },
  },
}));

export const DescriptionSummary: Story = createStory(createSource({
  operation: {
    description: "Operation description",
    summary: "Operation summary",
  },
}));

export const DescriptionExtensions: Story = createStory(createSource({
  operation: {
    description: "Operation description",
    ...EXTENSIONS,
  },
}));

export const DescriptionBindingsOneOption: Story = createStory(createSource({
  operation: {
    description: "Operation description",
    bindings: {
      kafka: {
        bindingVersion: "0.5.0",
        topic: "events.operation.description",
        clientId: "api-doc-viewer-client",
      }
    },
  },
}));

export const ExtensionsBindingsOneOption: Story = createStory(createSource({
  operation: {
    ...EXTENSIONS,
    bindings: {
      kafka: {
        bindingVersion: "0.5.0",
        topic: "events.operation.extension",
        clientId: "api-doc-viewer-client",
      }
    },
  },
}));

export const EdgeCaseBrokenRefBindings: Story = createStory(createSource({
  operation: {
    bindings: { $ref: "#/components/bindings/not-existing-bindings" },
  },
}));
