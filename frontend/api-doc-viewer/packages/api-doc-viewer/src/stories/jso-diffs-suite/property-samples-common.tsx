import { JsoDiffsViewer } from "@apihub/components/JsoViewer/JsoDiffsViewer";
import type { Meta, StoryObj } from "@storybook/react";
import type { ComponentProps } from "react";
import { prepareJsoDiffsDocument } from "../preprocess";
import { collectSampleCases } from "../utils/diffs-samples-cases";
import { parseYamlSource } from "../utils/parse-yaml-source";
import { TEST_DIFF_META_KEYS } from "./shared-test-data";

const beforeFiles = import.meta.glob(
  "../../../../samples/jso-diffs/property/*/before.yaml",
  { as: "raw", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/jso-diffs/property/*/after.yaml",
  { as: "raw", eager: true },
) as Record<string, string>;

const sampleCases = collectSampleCases(beforeFiles, afterFiles);

export const sampleById = Object.fromEntries(sampleCases.map((item) => [item.caseId, item])) as Record<
  string,
  (typeof sampleCases)[number]
>;

type JsoDiffsViewerProps = ComponentProps<typeof JsoDiffsViewer>;

export type JsoPropertySamplesStoryProps = {
  caseId: string;
};

export const JsoPropertySamplesStory = ({ caseId }: JsoPropertySamplesStoryProps) => {
  const selected = sampleById[caseId];

  if (!selected) {
    return <div>Sample case not found: {caseId}</div>;
  }

  return (
    <JsoDiffsViewer
      {...createViewerArgs(selected.beforeYaml, selected.afterYaml)}
    />
  );
};

export type JsoPropertySamplesStoryMeta = Meta<typeof JsoPropertySamplesStory>;
export type JsoPropertySamplesStoryObj = StoryObj<JsoPropertySamplesStoryMeta>;

const createSource = (sourceText: string): Record<string, unknown> => parseYamlSource(sourceText);

const createViewerArgs = (beforeSourceText: string, afterSourceText: string): JsoDiffsViewerProps => ({
  mergedSource: prepareJsoDiffsDocument({
    beforeSource: createSource(beforeSourceText),
    afterSource: createSource(afterSourceText),
    diffMetaKeys: TEST_DIFF_META_KEYS,
  }),
  initialLevel: 1,
  supportJsonSchema: true,
  diffMetaKeys: TEST_DIFF_META_KEYS,
});

export const createCaseStory = (caseId: string): JsoPropertySamplesStoryObj => ({
  name: caseId,
  args: {
    caseId,
  },
  render: (args) => <JsoPropertySamplesStory caseId={args.caseId} />,
});
