import type { Meta, StoryObj } from "@storybook/react-vite";
import { collectSampleCases } from "../utils/diffs-samples-cases";
import {
  JsonSchemaDiffSamplesStory,
  createJsonSchemaDiffCaseStoryFactory,
  jsonSchemaDiffSampleReadonlyArgTypes,
} from "../json-schema-diffs-suite/json-schema-diffs-utils";
import { createSampleById } from "../utils/sample-cases";

const beforeFiles = import.meta.glob(
  "../../../../samples/json-schema-diffs/extensions/array-two-items/*/before.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/json-schema-diffs/extensions/array-two-items/*/after.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleCases = collectSampleCases(beforeFiles, afterFiles);
const sampleById = createSampleById(sampleCases);

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSON Schema Diffs Suite (Extensions)/Node Diff to Extension Inheritance/Array Two Items",
  component: JsonSchemaDiffSamplesStory,
  argTypes: jsonSchemaDiffSampleReadonlyArgTypes,
} satisfies Meta<typeof JsonSchemaDiffSamplesStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const createCaseStory = createJsonSchemaDiffCaseStoryFactory(
  JsonSchemaDiffSamplesStory,
  sampleById,
);

export const Case_01_second_item_added: Story = createCaseStory("01-second-item-added");
export const Case_02_second_item_removed: Story = createCaseStory("02-second-item-removed");
