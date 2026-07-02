import { DdlTableViewer } from "@apihub/components/DdlTableViewer/DdlTableViewer";
import { SIMPLE_DISPLAY_MODE } from "@apihub/types/DisplayMode";
import type { Meta, StoryObj } from "@storybook/react";
import {
  collectDdlSampleCases,
  createDdlSampleById,
} from "../utils/ddl-samples-cases";
import { createCaseStoryFactory } from "./ddl-samples-common";

const sampleFiles = import.meta.glob(
  "../../../../samples/ddlapi/display-mode-simple/*/sample.sql",
  { as: "raw", eager: true },
) as Record<string, string>;

const sampleCases = collectDdlSampleCases(sampleFiles);
const sampleById = createDdlSampleById(sampleCases);
const createCaseStory = createCaseStoryFactory(sampleById, { displayMode: SIMPLE_DISPLAY_MODE });

// eslint-disable-next-line storybook/story-exports
const meta = {
  id: "ddlapi-suite-display-mode-simple",
  title: "DDL API Suite/Display Mode Simple",
  component: DdlTableViewer,
} satisfies Meta<typeof DdlTableViewer>;

export default meta;

type Story = StoryObj<typeof DdlTableViewer>;

export const DefaultValue: Story = createCaseStory("default-value");
export const EnumValues: Story = createCaseStory("enum-values");
export const GeneratedExpression: Story = createCaseStory("generated-expression");
export const LongDescription: Story = createCaseStory("long-description");
