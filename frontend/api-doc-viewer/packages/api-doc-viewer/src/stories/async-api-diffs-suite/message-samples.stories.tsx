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
  "../../../../samples/async-api-diffs/message/*/before.yaml",
  { as: "raw", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/async-api-diffs/message/*/after.yaml",
  { as: "raw", eager: true },
) as Record<string, string>;

const sampleCases = collectSampleCases(beforeFiles, afterFiles);
const sampleById = createAsyncApiSampleById(sampleCases);

const AsyncApiMessageSamplesStory = ({
  beforeYaml,
  afterYaml,
}: AsyncApiCaseStoryComponentProps) => (
  <AsyncApiOperationDiffsViewer
    {...createViewerArgs(beforeYaml, afterYaml)}
  />
);

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "Async API Diffs Suite/Message Samples",
  component: AsyncApiMessageSamplesStory,
  argTypes: asyncApiDiffSampleReadonlyArgTypes,
} satisfies Meta<typeof AsyncApiMessageSamplesStory>;

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
  AsyncApiMessageSamplesStory,
  sampleById,
);

const createCaseStory = (caseId: string): Story => createCaseStoryBase(caseId);

export const Case_1_1_message_title_changed: Story = createCaseStory("1.1-message-title-changed");
export const Case_1_2_message_title_removed: Story = createCaseStory("1.2-message-title-removed");
export const Case_1_3_message_title_added: Story = createCaseStory("1.3-message-title-added");
export const Case_2_1_message_description_changed: Story = createCaseStory("2.1-message-description-changed");
export const Case_2_2_message_description_removed: Story = createCaseStory("2.2-message-description-removed");
export const Case_2_3_message_description_added: Story = createCaseStory("2.3-message-description-added");
export const Case_2_4_message_long_description_changed: Story = createCaseStory("2.4-message-long-description-changed");
export const Case_2_5_message_long_description_removed: Story = createCaseStory("2.5-message-long-description-removed");
export const Case_2_6_message_long_description_added: Story = createCaseStory("2.6-message-long-description-added");
export const Case_2_7_message_summary_changed: Story = createCaseStory("2.7-message-summary-changed");
export const Case_2_8_message_summary_removed: Story = createCaseStory("2.8-message-summary-removed");
export const Case_2_9_message_summary_added: Story = createCaseStory("2.9-message-summary-added");
export const Case_2_10_message_long_summary_changed: Story = createCaseStory("2.10-message-long-summary-changed");
export const Case_2_11_message_long_summary_removed: Story = createCaseStory("2.11-message-long-summary-removed");
export const Case_2_12_message_long_summary_added: Story = createCaseStory("2.12-message-long-summary-added");
export const Case_2_13_message_description_moved_to_summary: Story = createCaseStory("2.13-message-description-moved-to-summary");
export const Case_2_14_message_long_description_moved_to_summary: Story = createCaseStory("2.14-message-long-description-moved-to-summary");
export const Case_2_15_message_long_description_moved_to_long_summary: Story = createCaseStory("2.15-message-long-description-moved-to-long-summary");
export const Case_2_16_message_description_moved_to_long_summary: Story = createCaseStory("2.16-message-description-moved-to-long-summary");
export const Case_2_17_message_summary_moved_to_description: Story = createCaseStory("2.17-message-summary-moved-to-description");
export const Case_2_18_message_long_summary_moved_to_description: Story = createCaseStory("2.18-message-long-summary-moved-to-description");
export const Case_2_19_message_long_summary_moved_to_long_description: Story = createCaseStory("2.19-message-long-summary-moved-to-long-description");
export const Case_2_20_message_summary_moved_to_long_description: Story = createCaseStory("2.20-message-summary-moved-to-long-description");
export const Case_3_1_message_bindings_add_one_more_binding: Story = createCaseStory("3.1-message-bindings-add-one-more-binding");
export const Case_3_2_message_bindings_remove_one_of_several_bindings: Story = createCaseStory("3.2-message-bindings-remove-one-of-several-bindings");
export const Case_3_3_message_bindings_add_bindings: Story = createCaseStory("3.3-message-bindings-add-bindings");
export const Case_3_4_message_bindings_remove_bindings: Story = createCaseStory("3.4-message-bindings-remove-bindings");
export const Case_4_1_message_bindings_kafka_bindingVersion_changed: Story = createCaseStory("4.1-message-bindings-kafka-bindingVersion-changed");
export const Case_4_2_message_bindings_kafka_bindingVersion_removed: Story = createCaseStory("4.2-message-bindings-kafka-bindingVersion-removed");
export const Case_4_3_message_bindings_kafka_bindingVersion_added: Story = createCaseStory("4.3-message-bindings-kafka-bindingVersion-added");
export const Case_5_1_message_bindings_kafka_internal_jso_changes: Story = createCaseStory("5.1-message-bindings-kafka-internal-jso-changes");
export const Case_6_1_message_x_second_added: Story = createCaseStory("6.1-message-x-second-added");
export const Case_6_2_message_x_second_removed: Story = createCaseStory("6.2-message-x-second-removed");
export const Case_6_3_message_x_second_changed: Story = createCaseStory("6.3-message-x-second-changed");
export const Case_6_4_message_x_first_and_x_second_added: Story = createCaseStory("6.4-message-x-first-and-x-second-added");
export const Case_6_5_message_x_first_and_x_second_removed: Story = createCaseStory("6.5-message-x-first-and-x-second-removed");
export const Case_7_1_message_headers_object_schema_added: Story = createCaseStory("7.1-message-headers-object-schema-added");
export const Case_7_2_message_headers_object_schema_removed: Story = createCaseStory("7.2-message-headers-object-schema-removed");
export const Case_7_3_message_headers_description_changed: Story = createCaseStory("7.3-message-headers-description-changed");
export const Case_7_4_message_payload_object_schema_added: Story = createCaseStory("7.4-message-payload-object-schema-added");
export const Case_7_5_message_payload_object_schema_removed: Story = createCaseStory("7.5-message-payload-object-schema-removed");
export const Case_7_6_message_payload_description_changed: Story = createCaseStory("7.6-message-payload-description-changed");
export const Case_8_1_message_headers_object_schema_added_extensions: Story = createCaseStory("8.1-message-headers-object-schema-added-extensions");
export const Case_8_2_message_headers_object_schema_removed_extensions: Story = createCaseStory("8.2-message-headers-object-schema-removed-extensions");
export const Case_8_3_message_headers_object_schema_changed_extensions: Story = createCaseStory("8.3-message-headers-object-schema-changed-extensions");
export const Case_8_4_message_headers_object_schema_added_property_with_extensions: Story = createCaseStory("8.4-message-headers-object-schema-added-property-with-extensions");
export const Case_8_5_message_headers_object_schema_removed_property_with_extensions: Story = createCaseStory("8.5-message-headers-object-schema-removed-property-with-extensions");
export const Case_8_6_message_payload_object_schema_added_extensions: Story = createCaseStory("8.6-message-payload-object-schema-added-extensions");
export const Case_8_7_message_payload_object_schema_removed_extensions: Story = createCaseStory("8.7-message-payload-object-schema-removed-extensions");
export const Case_8_8_message_payload_object_schema_changed_extensions: Story = createCaseStory("8.8-message-payload-object-schema-changed-extensions");
export const Case_8_9_message_payload_object_schema_added_property_with_extensions: Story = createCaseStory("8.9-message-payload-object-schema-added-property-with-extensions");
export const Case_8_10_message_payload_object_schema_removed_property_with_extensions: Story = createCaseStory("8.10-message-payload-object-schema-removed-property-with-extensions");
