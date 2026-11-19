import {
  type AsyncApiOperationDiffsViewerProps
} from "@apihub/components/AsyncApiOperationViewer/AsyncApiOperationDiffsViewer";
import type { ArgTypes } from "@storybook/react-vite";
import { TEST_REFERENCE_NAME_PROPERTY } from "../async-api-suite/shared-test-data";
import { prepareAsyncApiDiffsDocument } from "../preprocess";
import {
  AUTO_SWITCH_ARG_TYPES,
  AUTO_SWITCH_DEFAULT_ARGS,
  type AutoSwitchArgs,
  type AutoSwitchParameters,
  autoSwitchParameters,
  playAutoSwitch,
} from "../shared/auto-switch";
import { parseYamlSource } from "../utils/parse-yaml-source";
import { TEST_DIFF_META_KEYS } from "../shared/test-diff-meta-keys";

export type AsyncApiDiffSampleCase = {
  caseId: string;
  beforeYaml: string;
  afterYaml: string;
};

export type AsyncApiCaseStoryComponentProps = Pick<
  AsyncApiDiffSampleCase,
  "caseId" | "beforeYaml" | "afterYaml"
> & AutoSwitchArgs;

export const asyncApiDiffSampleReadonlyArgTypes = {
  beforeYaml: {
    control: { type: "text" },
    table: { category: "Sample" },
    description:
      "Before sample YAML for reference. The viewer always uses the bundled fixture for the selected case.",
  },
  afterYaml: {
    control: { type: "text" },
    table: { category: "Sample" },
    description:
      "After sample YAML for reference. The viewer always uses the bundled fixture for the selected case.",
  },
  ...AUTO_SWITCH_ARG_TYPES,
} satisfies Partial<ArgTypes<AsyncApiCaseStoryComponentProps>>;

type AsyncApiCaseStoryArgs = {
  name: string;
  args: AsyncApiCaseStoryComponentProps;
  argTypes: typeof asyncApiDiffSampleReadonlyArgTypes;
  render: (args: AsyncApiCaseStoryComponentProps) => JSX.Element;
  parameters: AutoSwitchParameters;
  play: typeof playAutoSwitch;
};

export const createAsyncApiSource = (sourceText: string): Record<string, unknown> =>
  parseYamlSource(sourceText);

export type AsyncApiDiffsSuiteOperationKeys = {
  operationKey: string;
  messageKey: string;
};

/** Operation/message every synthetic AsyncAPI diff fixture declares (all suites but whole-apihub-operation). */
export const ASYNC_API_DIFFS_SUITE_OPERATION_KEYS: AsyncApiDiffsSuiteOperationKeys = {
  operationKey: "sendOperation",
  messageKey: "TestMessage",
};

export const createAsyncApiViewerArgs = (
  beforeSourceText: string,
  afterSourceText: string,
  options: AsyncApiDiffsSuiteOperationKeys = ASYNC_API_DIFFS_SUITE_OPERATION_KEYS,
): AsyncApiOperationDiffsViewerProps => ({
  devMode: true,
  mergedSource: prepareAsyncApiDiffsDocument({
    beforeSource: createAsyncApiSource(beforeSourceText),
    afterSource: createAsyncApiSource(afterSourceText),
  }),
  operationKeys: {
    operationKey: options.operationKey,
    messageKey: options.messageKey,
  },
  referenceNamePropertyKey: TEST_REFERENCE_NAME_PROPERTY,
  diffMetaKeys: TEST_DIFF_META_KEYS,
});

/**
 * One story per sample case. On load, the story selects `sectionTestId` (the message section tab
 * the suite covers, e.g. `message-channel`) and then every changed selector option
 * (`playAutoSwitch`).
 */
export const createAsyncApiCaseStoryFactory = (
  StoryComponent: (props: AsyncApiCaseStoryComponentProps) => JSX.Element,
  sampleById: Record<string, AsyncApiDiffSampleCase>,
  sectionTestId?: string,
) => (caseId: string): AsyncApiCaseStoryArgs => {
  const sample = sampleById[caseId];
  if (!sample) {
    throw new Error(`Sample case not found: ${caseId}`);
  }

  return {
    name: caseId,
    args: {
      caseId,
      beforeYaml: sample.beforeYaml,
      afterYaml: sample.afterYaml,
      ...AUTO_SWITCH_DEFAULT_ARGS,
    },
    argTypes: asyncApiDiffSampleReadonlyArgTypes,
    render: (args) => {
      const sample = sampleById[args.caseId];
      return (
        <StoryComponent
          caseId={args.caseId}
          beforeYaml={sample.beforeYaml}
          afterYaml={sample.afterYaml}
        />
      );
    },
    parameters: autoSwitchParameters(sectionTestId === undefined ? [] : [sectionTestId]),
    play: playAutoSwitch,
  };
};
