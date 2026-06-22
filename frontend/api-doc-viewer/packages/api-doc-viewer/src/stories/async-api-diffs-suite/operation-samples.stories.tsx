import { AsyncApiOperationDiffsViewer } from "@apihub/components/AsyncApiOperationViewer/AsyncApiOperationDiffsViewer";
import type { Meta, StoryObj } from "@storybook/react";
import { collectSampleCases } from "../utils/diffs-samples-cases";
import {
  createAsyncApiCaseStoryFactory,
  createAsyncApiSampleById,
  createAsyncApiViewerArgs
} from "./async-api-diffs-utils";

const beforeFiles = import.meta.glob(
  "../../../../samples/async-api-diffs/operation/*/before.yaml",
  { as: "raw", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/async-api-diffs/operation/*/after.yaml",
  { as: "raw", eager: true },
) as Record<string, string>;

const sampleCases = collectSampleCases(beforeFiles, afterFiles);
const sampleById = createAsyncApiSampleById(sampleCases);

const AsyncApiOperationSamplesStory = ({ caseId }: { caseId: string }) => {
  const selected = sampleById[caseId];

  if (!selected) {
    return <div>Sample case not found: {caseId}</div>;
  }

  return (
    <AsyncApiOperationDiffsViewer
      {...createViewerArgs(selected.beforeYaml, selected.afterYaml)}
    />
  );
};

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "Async API Diffs Suite/Operation Samples",
  component: AsyncApiOperationSamplesStory,
} satisfies Meta<typeof AsyncApiOperationSamplesStory>;

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
  AsyncApiOperationSamplesStory,
  "message-operation",
);

const createCaseStory = (caseId: string): Story => createCaseStoryBase(caseId);

export const Case_1_1_operation_title_changed: Story = createCaseStory("1.1-operation-title-changed");
export const Case_1_2_operation_title_removed: Story = createCaseStory("1.2-operation-title-removed");
export const Case_1_3_operation_title_added: Story = createCaseStory("1.3-operation-title-added");
export const Case_2_1_operation_description_changed: Story = createCaseStory("2.1-operation-description-changed");
export const Case_2_2_operation_description_removed: Story = createCaseStory("2.2-operation-description-removed");
export const Case_2_3_operation_description_added: Story = createCaseStory("2.3-operation-description-added");
export const Case_2_4_operation_long_description_changed: Story = createCaseStory("2.4-operation-long-description-changed");
export const Case_2_5_operation_long_description_removed: Story = createCaseStory("2.5-operation-long-description-removed");
export const Case_2_6_operation_long_description_added: Story = createCaseStory("2.6-operation-long-description-added");
export const Case_2_7_operation_summary_changed: Story = createCaseStory("2.7-operation-summary-changed");
export const Case_2_8_operation_summary_removed: Story = createCaseStory("2.8-operation-summary-removed");
export const Case_2_9_operation_summary_added: Story = createCaseStory("2.9-operation-summary-added");
export const Case_2_10_operation_long_summary_changed: Story = createCaseStory("2.10-operation-long-summary-changed");
export const Case_2_11_operation_long_summary_removed: Story = createCaseStory("2.11-operation-long-summary-removed");
export const Case_2_12_operation_long_summary_added: Story = createCaseStory("2.12-operation-long-summary-added");
export const Case_2_13_operation_description_moved_to_summary: Story = createCaseStory("2.13-operation-description-moved-to-summary");
export const Case_2_14_operation_long_description_moved_to_summary: Story = createCaseStory("2.14-operation-long-description-moved-to-summary");
export const Case_2_15_operation_long_description_moved_to_long_summary: Story = createCaseStory("2.15-operation-long-description-moved-to-long-summary");
export const Case_2_16_operation_description_moved_to_long_summary: Story = createCaseStory("2.16-operation-description-moved-to-long-summary");
export const Case_2_17_operation_summary_moved_to_description: Story = createCaseStory("2.17-operation-summary-moved-to-description");
export const Case_2_18_operation_long_summary_moved_to_description: Story = createCaseStory("2.18-operation-long-summary-moved-to-description");
export const Case_2_19_operation_long_summary_moved_to_long_description: Story = createCaseStory("2.19-operation-long-summary-moved-to-long-description");
export const Case_2_20_operation_summary_moved_to_long_description: Story = createCaseStory("2.20-operation-summary-moved-to-long-description");
export const Case_3_1_operation_bindings_add_one_more_binding: Story = createCaseStory("3.1-operation-bindings-add-one-more-binding");
export const Case_3_2_operation_bindings_remove_one_of_several_bindings: Story = createCaseStory("3.2-operation-bindings-remove-one-of-several-bindings");
export const Case_3_3_operation_bindings_add_bindings: Story = createCaseStory("3.3-operation-bindings-add-bindings");
export const Case_3_4_operation_bindings_remove_bindings: Story = createCaseStory("3.4-operation-bindings-remove-bindings");
export const Case_4_1_operation_bindings_kafka_bindingVersion_changed: Story = createCaseStory("4.1-operation-bindings-kafka-bindingVersion-changed");
export const Case_4_2_operation_bindings_kafka_bindingVersion_removed: Story = createCaseStory("4.2-operation-bindings-kafka-bindingVersion-removed");
export const Case_4_3_operation_bindings_kafka_bindingVersion_added: Story = createCaseStory("4.3-operation-bindings-kafka-bindingVersion-added");
export const Case_5_1_operation_bindings_kafka_internal_jso_changes: Story = createCaseStory("5.1-operation-bindings-kafka-internal-jso-changes");
export const Case_6_1_operation_x_second_added: Story = createCaseStory("6.1-operation-x-second-added");
export const Case_6_2_operation_x_second_removed: Story = createCaseStory("6.2-operation-x-second-removed");
export const Case_6_3_operation_x_second_changed: Story = createCaseStory("6.3-operation-x-second-changed");
export const Case_6_4_operation_x_first_and_x_second_added: Story = createCaseStory("6.4-operation-x-first-and-x-second-added");
export const Case_6_5_operation_x_first_and_x_second_removed: Story = createCaseStory("6.5-operation-x-first-and-x-second-removed");
