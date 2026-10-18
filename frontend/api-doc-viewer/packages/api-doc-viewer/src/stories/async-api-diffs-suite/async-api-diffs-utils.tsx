import {
  type AsyncApiOperationDiffsViewerProps
} from "@apihub/components/AsyncApiOperationViewer/AsyncApiOperationDiffsViewer";
import type { ArgTypes } from "@storybook/react";
import { userEvent, within } from "@storybook/test";
import { TEST_REFERENCE_NAME_PROPERTY } from "../async-api-suite/shared-test-data";
import { prepareAsyncApiDiffsDocument } from "../preprocess";
import { parseYamlSource } from "../utils/parse-yaml-source";
import { TEST_DIFF_META_KEYS } from "./shared-test-data";

export type AsyncApiDiffSampleCase = {
  caseId: string;
  beforeYaml: string;
  afterYaml: string;
};

export type AsyncApiCaseStoryComponentProps = Pick<
  AsyncApiDiffSampleCase,
  "caseId" | "beforeYaml" | "afterYaml"
>;

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
} satisfies Partial<ArgTypes<AsyncApiCaseStoryComponentProps>>;

type AsyncApiCaseStoryArgs = {
  name: string;
  args: AsyncApiCaseStoryComponentProps;
  argTypes: typeof asyncApiDiffSampleReadonlyArgTypes;
  render: (args: AsyncApiCaseStoryComponentProps) => JSX.Element;
  play?: (context: { canvasElement: HTMLElement }) => Promise<void>;
};

export const createAsyncApiSource = (sourceText: string): Record<string, unknown> =>
  parseYamlSource(sourceText);

export const createAsyncApiViewerArgs = (
  beforeSourceText: string,
  afterSourceText: string,
  options: {
    operationKey: string;
    messageKey: string;
  },
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

export const createAsyncApiSampleById = <TSample extends AsyncApiDiffSampleCase>(
  sampleCases: readonly TSample[],
): Record<string, TSample> =>
  sampleCases.reduce<Record<string, TSample>>((accumulator, sampleCase) => {
    accumulator[sampleCase.caseId] = sampleCase;
    return accumulator;
  }, {});

export const createAsyncApiCaseStoryFactory = (
  StoryComponent: (props: AsyncApiCaseStoryComponentProps) => JSX.Element,
  sampleById: Record<string, AsyncApiDiffSampleCase>,
  playTestId?: string,
) => {
  const baseFactory = (caseId: string): AsyncApiCaseStoryArgs => {
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
    };
  };

  if (playTestId === undefined) {
    return baseFactory;
  }

  return (caseId: string): AsyncApiCaseStoryArgs => ({
    ...baseFactory(caseId),
    play: async ({ canvasElement }) => {
      const canvas = within(canvasElement);
      const buttons = await canvas.findAllByTestId(playTestId);

      if (buttons.length > 0) {
        await userEvent.click(buttons[0]);
      }
    },
  });
};

