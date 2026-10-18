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
  "../../../../samples/async-api-diffs/channel-server/*/before.yaml",
  { as: "raw", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/async-api-diffs/channel-server/*/after.yaml",
  { as: "raw", eager: true },
) as Record<string, string>;

const sampleCases = collectSampleCases(beforeFiles, afterFiles);
const sampleById = createAsyncApiSampleById(sampleCases);

const AsyncApiServerSamplesStory = ({
  beforeYaml,
  afterYaml,
}: AsyncApiCaseStoryComponentProps) => (
  <AsyncApiOperationDiffsViewer
    {...createViewerArgs(beforeYaml, afterYaml)}
  />
);

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "Async API Diffs Suite/Channel Server Samples",
  component: AsyncApiServerSamplesStory,
  argTypes: asyncApiDiffSampleReadonlyArgTypes,
} satisfies Meta<typeof AsyncApiServerSamplesStory>;

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
  AsyncApiServerSamplesStory,
  sampleById,
  "message-channel",
);

const createCaseStory = (caseId: string): Story => createCaseStoryBase(caseId);

export const Case_1_1_channel_servers_host_protocol_changed: Story = createCaseStory("1.1-channel-servers-host-protocol-changed");
export const Case_1_2_channel_server_description_changed: Story = createCaseStory("1.2-channel-server-description-changed");
export const Case_1_3_channel_server_description_removed: Story = createCaseStory("1.3-channel-server-description-removed");
export const Case_1_4_channel_server_description_added: Story = createCaseStory("1.4-channel-server-description-added");
export const Case_1_5_channel_server_long_description_changed: Story = createCaseStory("1.5-channel-server-long-description-changed");
export const Case_1_6_channel_server_long_description_removed: Story = createCaseStory("1.6-channel-server-long-description-removed");
export const Case_1_7_channel_server_long_description_added: Story = createCaseStory("1.7-channel-server-long-description-added");
export const Case_1_8_channel_server_summary_changed: Story = createCaseStory("1.8-channel-server-summary-changed");
export const Case_1_9_channel_server_summary_removed: Story = createCaseStory("1.9-channel-server-summary-removed");
export const Case_1_10_channel_server_summary_added: Story = createCaseStory("1.10-channel-server-summary-added");
export const Case_1_11_channel_server_long_summary_changed: Story = createCaseStory("1.11-channel-server-long-summary-changed");
export const Case_1_12_channel_server_long_summary_removed: Story = createCaseStory("1.12-channel-server-long-summary-removed");
export const Case_1_13_channel_server_long_summary_added: Story = createCaseStory("1.13-channel-server-long-summary-added");
export const Case_1_14_channel_server_description_moved_to_summary: Story = createCaseStory("1.14-channel-server-description-moved-to-summary");
export const Case_1_15_channel_server_long_description_moved_to_summary: Story = createCaseStory("1.15-channel-server-long-description-moved-to-summary");
export const Case_1_16_channel_server_long_description_moved_to_long_summary: Story = createCaseStory("1.16-channel-server-long-description-moved-to-long-summary");
export const Case_1_17_channel_server_description_moved_to_long_summary: Story = createCaseStory("1.17-channel-server-description-moved-to-long-summary");
export const Case_1_18_channel_server_summary_moved_to_description: Story = createCaseStory("1.18-channel-server-summary-moved-to-description");
export const Case_1_19_channel_server_long_summary_moved_to_description: Story = createCaseStory("1.19-channel-server-long-summary-moved-to-description");
export const Case_1_20_channel_server_long_summary_moved_to_long_description: Story = createCaseStory("1.20-channel-server-long-summary-moved-to-long-description");
export const Case_1_21_channel_server_summary_moved_to_long_description: Story = createCaseStory("1.21-channel-server-summary-moved-to-long-description");
export const Case_1_22_channel_servers_description_set: Story = createCaseStory("1.22-channel-servers-description-set");
export const Case_1_23_channel_servers_summary_set: Story = createCaseStory("1.23-channel-servers-summary-set");
export const Case_2_1_channel_servers0_bindings_add_one_more_binding: Story = createCaseStory("2.1-channel-servers0-bindings-add-one-more-binding");
export const Case_2_2_channel_servers0_bindings_remove_one_of_several_bindings: Story = createCaseStory("2.2-channel-servers0-bindings-remove-one-of-several-bindings");
export const Case_2_3_channel_servers0_bindings_add_bindings: Story = createCaseStory("2.3-channel-servers0-bindings-add-bindings");
export const Case_2_4_channel_servers0_bindings_remove_bindings: Story = createCaseStory("2.4-channel-servers0-bindings-remove-bindings");
export const Case_2_3_channel_servers_all_added: Story = createCaseStory("2.3-channel-servers-all-added");
export const Case_2_4_channel_servers_all_removed: Story = createCaseStory("2.4-channel-servers-all-removed");
export const Case_3_1_channel_servers0_bindings_kafka_bindingVersion_changed: Story = createCaseStory("3.1-channel-servers0-bindings-kafka-bindingVersion-changed");
export const Case_3_2_channel_servers0_bindings_kafka_bindingVersion_removed: Story = createCaseStory("3.2-channel-servers0-bindings-kafka-bindingVersion-removed");
export const Case_3_3_channel_servers0_bindings_kafka_bindingVersion_added: Story = createCaseStory("3.3-channel-servers0-bindings-kafka-bindingVersion-added");
export const Case_4_1_channel_server_bindings_kafka_internal_jso_changes: Story = createCaseStory("4.1-channel-server-bindings-kafka-internal-jso-changes");
export const Case_5_1_channel_servers_one_item_removed: Story = createCaseStory("5.1-channel-servers-one-item-removed");
export const Case_5_2_channel_servers_one_item_added: Story = createCaseStory("5.2-channel-servers-one-item-added");
