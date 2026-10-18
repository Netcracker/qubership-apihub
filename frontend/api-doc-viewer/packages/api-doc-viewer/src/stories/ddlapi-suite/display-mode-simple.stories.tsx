import { SIMPLE_DISPLAY_MODE } from "@apihub/types/DisplayMode";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  collectDdlSampleCases,
} from "../utils/ddl-samples-cases";
import { createSampleById } from "../utils/sample-cases";
import {
  DdlSampleStory,
  createCaseStoryFactory,
  ddlSamplesStoryMetaBase,
  type DdlSamplesStoryObj,
} from "./ddl-samples-common";

const sampleFiles = import.meta.glob(
  "../../../../samples/ddlapi/display-mode-simple/*/sample.sql",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleCases = collectDdlSampleCases(sampleFiles);
const sampleById = createSampleById(sampleCases);
const createCaseStory = createCaseStoryFactory(sampleById, { displayMode: SIMPLE_DISPLAY_MODE });

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...ddlSamplesStoryMetaBase,
  id: "ddlapi-suite-display-mode-simple",
  title: "DDL API Suite/Display Mode Simple",
} satisfies Meta<typeof DdlSampleStory>;

export default meta;

type Story = DdlSamplesStoryObj;

export const DefaultValue: Story = createCaseStory("default-value");
export const EnumValues: Story = createCaseStory("enum-values");
export const GeneratedExpression: Story = createCaseStory("generated-expression");
export const LongDescription: Story = createCaseStory("long-description");
