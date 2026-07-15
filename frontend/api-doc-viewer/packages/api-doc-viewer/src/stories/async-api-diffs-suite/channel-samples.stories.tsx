import { AsyncApiOperationDiffsViewer } from "@apihub/components/AsyncApiOperationViewer/AsyncApiOperationDiffsViewer";
import type { Meta, StoryObj } from "@storybook/react";
import { collectSampleCases } from "../utils/diffs-samples-cases";
import {
  type AsyncApiCaseStoryComponentProps,
  asyncApiDiffSampleReadonlyArgTypes,
  createAsyncApiCaseStoryFactory,
  createAsyncApiSampleById,
  createAsyncApiViewerArgs
} from "./async-api-diffs-utils";

const beforeFiles = import.meta.glob(
  "../../../../samples/async-api-diffs/channel/*/before.yaml",
  { as: "raw", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/async-api-diffs/channel/*/after.yaml",
  { as: "raw", eager: true },
) as Record<string, string>;

const sampleCases = collectSampleCases(beforeFiles, afterFiles);
const sampleById = createAsyncApiSampleById(sampleCases);

const AsyncApiChannelSamplesStory = ({
  beforeYaml,
  afterYaml,
}: AsyncApiCaseStoryComponentProps) => (
  <AsyncApiOperationDiffsViewer
    {...createViewerArgs(beforeYaml, afterYaml)}
  />
);

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "Async API Diffs Suite/Channel Samples",
  component: AsyncApiChannelSamplesStory,
  argTypes: asyncApiDiffSampleReadonlyArgTypes,
} satisfies Meta<typeof AsyncApiChannelSamplesStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const OPERATION_KEY = "sendOperation";
const MESSAGE_KEY = "TestMessage";

const createViewerArgs = (beforeSourceText: string, afterSourceText: string) =>
  createAsyncApiViewerArgs(beforeSourceText, afterSourceText, {
    operationKey: OPERATION_KEY,
    messageKey: MESSAGE_KEY,
  });

const createCaseStoryBase = createAsyncApiCaseStoryFactory(
  AsyncApiChannelSamplesStory,
  sampleById,
  "message-channel",
);

const createCaseStory = (caseId: string): Story => createCaseStoryBase(caseId);

export const Case_1_1_channel_title_changed: Story = createCaseStory("1.1-channel-title-changed");
export const Case_1_2_channel_title_removed: Story = createCaseStory("1.2-channel-title-removed");
export const Case_1_3_channel_title_added: Story = createCaseStory("1.3-channel-title-added");
export const Case_2_1_channel_description_changed: Story = createCaseStory("2.1-channel-description-changed");
export const Case_2_2_channel_description_removed: Story = createCaseStory("2.2-channel-description-removed");
export const Case_2_3_channel_description_added: Story = createCaseStory("2.3-channel-description-added");
export const Case_2_4_channel_long_description_changed: Story = createCaseStory("2.4-channel-long-description-changed");
export const Case_2_5_channel_long_description_removed: Story = createCaseStory("2.5-channel-long-description-removed");
export const Case_2_6_channel_long_description_added: Story = createCaseStory("2.6-channel-long-description-added");
export const Case_2_7_channel_summary_changed: Story = createCaseStory("2.7-channel-summary-changed");
export const Case_2_8_channel_summary_removed: Story = createCaseStory("2.8-channel-summary-removed");
export const Case_2_9_channel_summary_added: Story = createCaseStory("2.9-channel-summary-added");
export const Case_2_10_channel_long_summary_changed: Story = createCaseStory("2.10-channel-long-summary-changed");
export const Case_2_11_channel_long_summary_removed: Story = createCaseStory("2.11-channel-long-summary-removed");
export const Case_2_12_channel_long_summary_added: Story = createCaseStory("2.12-channel-long-summary-added");
export const Case_2_13_channel_description_moved_to_summary: Story = createCaseStory("2.13-channel-description-moved-to-summary");
export const Case_2_14_channel_long_description_moved_to_summary: Story = createCaseStory("2.14-channel-long-description-moved-to-summary");
export const Case_2_15_channel_long_description_moved_to_long_summary: Story = createCaseStory("2.15-channel-long-description-moved-to-long-summary");
export const Case_2_16_channel_description_moved_to_long_summary: Story = createCaseStory("2.16-channel-description-moved-to-long-summary");
export const Case_2_17_channel_summary_moved_to_description: Story = createCaseStory("2.17-channel-summary-moved-to-description");
export const Case_2_18_channel_long_summary_moved_to_description: Story = createCaseStory("2.18-channel-long-summary-moved-to-description");
export const Case_2_19_channel_long_summary_moved_to_long_description: Story = createCaseStory("2.19-channel-long-summary-moved-to-long-description");
export const Case_2_20_channel_summary_moved_to_long_description: Story = createCaseStory("2.20-channel-summary-moved-to-long-description");
export const Case_3_1_channel_bindings_add_one_more_binding: Story = createCaseStory("3.1-channel-bindings-add-one-more-binding");
export const Case_3_2_channel_bindings_remove_one_of_several_bindings: Story = createCaseStory("3.2-channel-bindings-remove-one-of-several-bindings");
export const Case_3_3_channel_bindings_add_bindings: Story = createCaseStory("3.3-channel-bindings-add-bindings");
export const Case_3_4_channel_bindings_remove_bindings: Story = createCaseStory("3.4-channel-bindings-remove-bindings");
export const Case_4_1_channel_bindings_kafka_bindingVersion_changed: Story = createCaseStory("4.1-channel-bindings-kafka-bindingVersion-changed");
export const Case_4_2_channel_bindings_kafka_bindingVersion_removed: Story = createCaseStory("4.2-channel-bindings-kafka-bindingVersion-removed");
export const Case_4_3_channel_bindings_kafka_bindingVersion_added: Story = createCaseStory("4.3-channel-bindings-kafka-bindingVersion-added");
export const Case_5_1_channel_bindings_kafka_internal_jso_changes: Story = createCaseStory("5.1-channel-bindings-kafka-internal-jso-changes");
export const Case_6_1_channel_x_second_added: Story = createCaseStory("6.1-channel-x-second-added");
export const Case_6_2_channel_x_second_removed: Story = createCaseStory("6.2-channel-x-second-removed");
export const Case_6_3_channel_x_second_changed: Story = createCaseStory("6.3-channel-x-second-changed");
export const Case_6_4_channel_x_first_and_x_second_added: Story = createCaseStory("6.4-channel-x-first-and-x-second-added");
export const Case_6_5_channel_x_first_and_x_second_removed: Story = createCaseStory("6.5-channel-x-first-and-x-second-removed");

