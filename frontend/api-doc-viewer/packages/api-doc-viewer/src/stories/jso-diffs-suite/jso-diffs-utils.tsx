import { JsoDiffsViewer } from "@apihub/components/JsoViewer/JsoDiffsViewer";
import type { ArgTypes } from "@storybook/react";
import type { ComponentProps } from "react";
import { prepareJsoDiffsDocument } from "../preprocess";
import { parseYamlSource } from "../utils/parse-yaml-source";
import { TEST_DIFF_META_KEYS } from "./shared-test-data";

export type JsoDiffSampleCase = {
  caseId: string;
  beforeYaml: string;
  afterYaml: string;
};

export type JsoCaseStoryComponentProps = Pick<
  JsoDiffSampleCase,
  "caseId" | "beforeYaml" | "afterYaml"
>;

export const jsoDiffSampleReadonlyArgTypes = {
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
} satisfies Partial<ArgTypes<JsoCaseStoryComponentProps>>;

type JsoDiffsViewerProps = ComponentProps<typeof JsoDiffsViewer>;

type JsoCaseStoryArgs = {
  name: string;
  args: JsoCaseStoryComponentProps;
  argTypes: typeof jsoDiffSampleReadonlyArgTypes;
  render: (args: JsoCaseStoryComponentProps) => JSX.Element;
};

const createSource = (sourceText: string): Record<string, unknown> => parseYamlSource(sourceText);

export const createJsoViewerArgs = (
  beforeSourceText: string,
  afterSourceText: string,
): JsoDiffsViewerProps => ({
  mergedSource: prepareJsoDiffsDocument({
    beforeSource: createSource(beforeSourceText),
    afterSource: createSource(afterSourceText),
    diffMetaKeys: TEST_DIFF_META_KEYS,
  }),
  initialLevel: 1,
  supportJsonSchema: true,
  diffMetaKeys: TEST_DIFF_META_KEYS,
});

export const createJsoSampleById = <TSample extends JsoDiffSampleCase>(
  sampleCases: readonly TSample[],
): Record<string, TSample> =>
  sampleCases.reduce<Record<string, TSample>>((accumulator, sampleCase) => {
    accumulator[sampleCase.caseId] = sampleCase;
    return accumulator;
  }, {});

export const createJsoCaseStoryFactory = (
  StoryComponent: (props: JsoCaseStoryComponentProps) => JSX.Element,
  sampleById: Record<string, JsoDiffSampleCase>,
) => (caseId: string): JsoCaseStoryArgs => {
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
    argTypes: jsoDiffSampleReadonlyArgTypes,
    render: (args) => {
      const resolvedSample = sampleById[args.caseId];
      return (
        <StoryComponent
          caseId={args.caseId}
          beforeYaml={resolvedSample.beforeYaml}
          afterYaml={resolvedSample.afterYaml}
        />
      );
    },
  };
};
