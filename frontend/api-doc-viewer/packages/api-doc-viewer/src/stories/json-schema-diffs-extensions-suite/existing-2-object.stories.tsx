import type { Meta, StoryObj } from "@storybook/react-vite";
import { collectSampleCases } from "../utils/diffs-samples-cases";
import {
  JsonSchemaDiffSamplesStory,
  createJsonSchemaDiffCaseStoryFactory,
  jsonSchemaDiffSampleReadonlyArgTypes,
} from "../json-schema-diffs-suite/json-schema-diffs-utils";
import { createSampleById } from "../utils/sample-cases";

const beforeFiles = import.meta.glob(
  "../../../../samples/json-schema-diffs/extensions/existing-2-object/*/before.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/json-schema-diffs/extensions/existing-2-object/*/after.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleCases = collectSampleCases(beforeFiles, afterFiles);
const sampleById = createSampleById(sampleCases);

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSON Schema Diffs Suite (Extensions)/Existing 2 Object",
  component: JsonSchemaDiffSamplesStory,
  argTypes: jsonSchemaDiffSampleReadonlyArgTypes,
} satisfies Meta<typeof JsonSchemaDiffSamplesStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const createCaseStory = createJsonSchemaDiffCaseStoryFactory(
  JsonSchemaDiffSamplesStory,
  sampleById,
);

export const Case_01_primitive_removed: Story = createCaseStory("01-primitive-removed");
export const Case_02_object_removed: Story = createCaseStory("02-object-removed");
export const Case_03_array_removed: Story = createCaseStory("03-array-removed");
export const Case_04_json_schema_removed: Story = createCaseStory("04-json-schema-removed");
export const Case_05_replaced_to_primitive: Story = createCaseStory("05-replaced-to-primitive");
export const Case_06_replaced_to_object: Story = createCaseStory("06-replaced-to-object");
export const Case_07_replaced_to_array: Story = createCaseStory("07-replaced-to-array");
export const Case_08_replaced_to_json_schema: Story = createCaseStory("08-replaced-to-json-schema");
export const Case_09_added_and_removed: Story = createCaseStory("09-added-and-removed");
export const Case_10_removed_and_replaced: Story = createCaseStory("10-removed-and-replaced");
export const Case_11_added_and_replaced: Story = createCaseStory("11-added-and-replaced");
export const Case_12_both_replaced: Story = createCaseStory("12-both-replaced");
export const Case_13_both_added: Story = createCaseStory("13-both-added");
export const Case_14_both_removed: Story = createCaseStory("14-both-removed");
