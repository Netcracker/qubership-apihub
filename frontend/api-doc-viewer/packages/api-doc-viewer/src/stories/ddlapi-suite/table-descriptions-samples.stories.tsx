import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  collectDdlSampleCases,
  createDdlSampleById,
} from "../utils/ddl-samples-cases";
import {
  DdlSampleStory,
  createCaseStoryFactory,
  ddlSamplesStoryMetaBase,
  type DdlSamplesStoryObj,
} from "./ddl-samples-common";

const sampleFiles = import.meta.glob(
  "../../../../samples/ddlapi/table-descriptions/*/sample.sql",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleCases = collectDdlSampleCases(sampleFiles);
const sampleById = createDdlSampleById(sampleCases);
const createCaseStory = createCaseStoryFactory(sampleById);

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...ddlSamplesStoryMetaBase,
  id: "ddlapi-suite-table-descriptions",
  title: "DDL API Suite/Table Descriptions",
} satisfies Meta<typeof DdlSampleStory>;

export default meta;

type Story = DdlSamplesStoryObj;

export const LongDescription: Story = createCaseStory("long-description");
export const ShortDescription: Story = createCaseStory("short-description");
