import { JsoDiffsViewer } from "@apihub/components/JsoViewer/JsoDiffsViewer";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { collectSampleCases } from "../utils/diffs-samples-cases";
import {
  type JsoCaseStoryComponentProps,
  createJsoCaseStoryFactory,
  createJsoViewerArgs,
  jsoDiffSampleReadonlyArgTypes,
} from "./jso-diffs-utils";
import { createSampleById } from "../utils/sample-cases";

const beforeFiles = import.meta.glob(
  "../../../../samples/jso-diffs/property/*/before.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/jso-diffs/property/*/after.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleCases = collectSampleCases(beforeFiles, afterFiles);
const sampleById = createSampleById(sampleCases);

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
