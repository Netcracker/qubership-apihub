import { AsyncApiOperationDiffsViewer } from "@apihub/components/AsyncApiOperationViewer/AsyncApiOperationDiffsViewer";
import type { Meta, StoryObj } from "@storybook/react";
import { collectSampleCases } from "../utils/diffs-samples-cases";
import {
  createAsyncApiCaseStoryFactory,
  createAsyncApiSampleById,
  createAsyncApiViewerArgs
} from "./async-api-diffs-utils";

const beforeFiles = import.meta.glob(
  "../../../../samples/async-api-diffs/whole-apihub-operation/*/before.yaml",
  { as: "raw", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/async-api-diffs/whole-apihub-operation/*/after.yaml",
  { as: "raw", eager: true },
) as Record<string, string>;

const sampleCases = collectSampleCases(beforeFiles, afterFiles);
const sampleById = createAsyncApiSampleById(sampleCases);

const AsyncApiWholeApihubOperationSamplesStory = ({ caseId }: { caseId: string }) => {
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
  title: "Async API Diffs Suite/Whole Apihub Operation Samples",
  component: AsyncApiWholeApihubOperationSamplesStory,
} satisfies Meta<typeof AsyncApiWholeApihubOperationSamplesStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const OPERATION_KEY = "ConsumeUserSignups";
const MESSAGE_KEY = "UserMessage";

const createViewerArgs = (beforeSourceText: string, afterSourceText: string) =>
  createAsyncApiViewerArgs(beforeSourceText, afterSourceText, {
    operationKey: OPERATION_KEY,
    messageKey: MESSAGE_KEY,
  });

const createCaseStoryBase = createAsyncApiCaseStoryFactory(
  AsyncApiWholeApihubOperationSamplesStory,
);

const createCaseStory = (caseId: string): Story => createCaseStoryBase(caseId);

export const Case_1_1_message_removed_from_operation_channel_and_document: Story = createCaseStory("1.1-message-removed-from-operation-channel-and-document");
export const Case_1_2_message_added_to_operation_channel_and_document: Story = createCaseStory("1.2-message-added-to-operation-channel-and-document");
