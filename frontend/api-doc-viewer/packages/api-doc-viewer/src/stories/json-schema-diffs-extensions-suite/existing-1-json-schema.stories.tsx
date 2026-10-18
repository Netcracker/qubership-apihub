import type { Meta, StoryObj } from "@storybook/react-vite";
import { collectSampleCases } from "../utils/diffs-samples-cases";
import {
  JsonSchemaDiffSamplesStory,
  createJsonSchemaDiffCaseStoryFactory,
  jsonSchemaDiffSampleReadonlyArgTypes,
} from "../json-schema-diffs-suite/json-schema-diffs-utils";
import { createSampleById } from "../utils/sample-cases";

const beforeFiles = import.meta.glob(
  "../../../../samples/json-schema-diffs/extensions/existing-1-json-schema/*/before.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/json-schema-diffs/extensions/existing-1-json-schema/*/after.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleCases = collectSampleCases(beforeFiles, afterFiles);
const sampleById = createSampleById(sampleCases);

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSON Schema Diffs Suite (Extensions)/Existing 1 JSON Schema",
  component: JsonSchemaDiffSamplesStory,
  argTypes: jsonSchemaDiffSampleReadonlyArgTypes,
} satisfies Meta<typeof JsonSchemaDiffSamplesStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const createCaseStory = createJsonSchemaDiffCaseStoryFactory(
  JsonSchemaDiffSamplesStory,
  sampleById,
);

export const Case_01_add_primitive: Story = createCaseStory("01-add-primitive");
export const Case_02_add_object: Story = createCaseStory("02-add-object");
export const Case_03_add_array: Story = createCaseStory("03-add-array");
export const Case_04_add_json_schema: Story = createCaseStory("04-add-json-schema");
export const Case_05_replace_to_primitive: Story = createCaseStory("05-replace-to-primitive");
export const Case_06_replace_to_object: Story = createCaseStory("06-replace-to-object");
export const Case_07_replace_to_array: Story = createCaseStory("07-replace-to-array");
export const Case_08_replace_to_json_schema: Story = createCaseStory("08-replace-to-json-schema");
