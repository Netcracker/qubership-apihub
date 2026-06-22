import { AsyncApiOperationDiffsViewer } from "@apihub/components/AsyncApiOperationViewer/AsyncApiOperationDiffsViewer";
import type { Meta, StoryObj } from "@storybook/react";
import { collectSampleCases } from "../utils/diffs-samples-cases";
import {
  createAsyncApiCaseStoryFactory,
  createAsyncApiSampleById,
  createAsyncApiViewerArgs
} from "./async-api-diffs-utils";

const beforeFiles = import.meta.glob(
  "../../../../samples/async-api-diffs/channel-parameters/*/before.yaml",
  { as: "raw", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/async-api-diffs/channel-parameters/*/after.yaml",
  { as: "raw", eager: true },
) as Record<string, string>;

const sampleCases = collectSampleCases(beforeFiles, afterFiles);
const sampleById = createAsyncApiSampleById(sampleCases);

const AsyncApiChannelParametersSamplesStory = ({ caseId }: { caseId: string }) => {
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
  title: "Async API Diffs Suite/Channel Parameters Samples",
  component: AsyncApiChannelParametersSamplesStory,
} satisfies Meta<typeof AsyncApiChannelParametersSamplesStory>;

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
  AsyncApiChannelParametersSamplesStory,
  "message-channel",
);

const createCaseStory = (caseId: string): Story => createCaseStoryBase(caseId);

export const Case_1_channel_parameters_two_added: Story = createCaseStory("1-channel-parameters-two-added");
export const Case_2_channel_parameters_two_removed: Story = createCaseStory("2-channel-parameters-two-removed");
export const Case_3_channel_parameters_second_added: Story = createCaseStory("3-channel-parameters-second-added");
export const Case_4_channel_parameters_second_removed: Story = createCaseStory("4-channel-parameters-second-removed");
export const Case_5_channel_parameters_key_renamed: Story = createCaseStory("5-channel-parameters-key-renamed");
export const Case_6_channel_parameters_fields_added: Story = createCaseStory("6-channel-parameters-fields-added");
export const Case_7_channel_parameters_fields_removed: Story = createCaseStory("7-channel-parameters-fields-removed");
export const Case_8_channel_parameters_fields_changed: Story = createCaseStory("8-channel-parameters-fields-changed");
