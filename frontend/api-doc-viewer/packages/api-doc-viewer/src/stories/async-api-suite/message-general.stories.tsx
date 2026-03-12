// It's necessary because storybook doesn't render nested stories without this empty story

import { AsyncApiOperationViewer } from "@apihub/components/AsyncApiOperationViewer/AsyncApiOperationViewer";
import type { Meta, StoryObj } from '@storybook/react';
import { TEST_REFERENCE_NAME_PROPERTY } from "./shared-test-data";
import { prepareAsyncApiDocument } from "../preprocess";

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: 'Async API Suite/Message',
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

const OPERATION_KEY = 'send-operation';
const CHANNEL_KEY = 'test-channel';
const MESSAGE_KEY = 'MessageID';

type MessageContent = {
  name?: string;
  title?: string;
  description?: string;
  summary?: string;
};

type ChannelContent = {
  address?: string;
  description?: string;
  summary?: string;
};

type SourceOptions = {
  message: MessageContent;
  channel?: ChannelContent;
  operationType?: 'send' | 'receive';
};

const createSource = ({ message, channel = {}, operationType = 'send' }: SourceOptions) => {
  return {
    asyncapi: "3.0.0",
    operations: {
      [OPERATION_KEY]: {
        action: operationType,
        channel: { $ref: `#/channels/${CHANNEL_KEY}` },
        messages: [{ $ref: `#/channels/${CHANNEL_KEY}/messages/${MESSAGE_KEY}` }],
      }
    },
    channels: {
      [CHANNEL_KEY]: {
        ...channel,
        messages: { [MESSAGE_KEY]: message },
      }
    }
  };
};

const createStory = (
  source: ReturnType<typeof createSource>,
): Story => ({
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

export const MessageIdSend: Story = createStory(createSource({
  message: {},
}));

export const MessageIdReceive: Story = createStory(
  createSource({
    message: {},
    operationType: 'receive',
  }),
);

export const Name: Story = createStory(createSource({
  message: { name: "Message Name" },
}));

export const Title: Story = createStory(createSource({
  message: { title: "Message Title" },
}));

export const NameTitle: Story = createStory(createSource({
  message: {
    name: "Message Name",
    title: "Message Title",
  },
}));

export const Address: Story = createStory(createSource({
  message: {},
  channel: { address: "test.address" },
}));

export const AddressDescription: Story = createStory(createSource({
  message: {
    description: "Message description"
  },
  channel: {
    address: "test.address",
  },
}));

export const AddressSummary: Story = createStory(createSource({
  message: {
    summary: "Message summary",
  },
  channel: {
    address: "test.address",
  },
}));

export const AddressDescriptionSummary: Story = createStory(createSource({
  message: {
    description: "Message description",
    summary: "Message summary",
  },
  channel: {
    address: "test.address",
  },
}));
