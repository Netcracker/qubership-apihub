import { JsoDiffsViewer } from "@apihub/components/JsoViewer/JsoDiffsViewer";
import type { Meta, StoryObj } from "@storybook/react";
import { collectSampleCases } from "../utils/diffs-samples-cases";
import {
  type JsoCaseStoryComponentProps,
  createJsoCaseStoryFactory,
  createJsoSampleById,
  createJsoViewerArgs,
  jsoDiffSampleReadonlyArgTypes,
} from "./jso-diffs-utils";

const beforeFiles = import.meta.glob(
  "../../../../samples/jso-diffs/property/*/before.yaml",
  { as: "raw", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/jso-diffs/property/*/after.yaml",
  { as: "raw", eager: true },
) as Record<string, string>;

const sampleCases = collectSampleCases(beforeFiles, afterFiles);
const sampleById = createJsoSampleById(sampleCases);

export const JsoPropertySamplesStory = ({
  beforeYaml,
  afterYaml,
}: JsoCaseStoryComponentProps) => (
  <JsoDiffsViewer {...createJsoViewerArgs(beforeYaml, afterYaml)} />
);

export type JsoPropertySamplesStoryMeta = Meta<typeof JsoPropertySamplesStory>;
export type JsoPropertySamplesStoryObj = StoryObj<JsoPropertySamplesStoryMeta>;

export const jsoPropertySamplesStoryMetaBase = {
  component: JsoPropertySamplesStory,
  argTypes: jsoDiffSampleReadonlyArgTypes,
} satisfies Pick<JsoPropertySamplesStoryMeta, "component" | "argTypes">;

const createCaseStoryBase = createJsoCaseStoryFactory(
  JsoPropertySamplesStory,
  sampleById,
);

export const createCaseStory = (caseId: string): JsoPropertySamplesStoryObj =>
  createCaseStoryBase(caseId);
