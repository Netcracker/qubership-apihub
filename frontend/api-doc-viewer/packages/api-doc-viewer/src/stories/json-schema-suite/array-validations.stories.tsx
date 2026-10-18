/**
 * Regenerate YAML samples: node bin/generate-json-schema-validation-samples.mjs
 * Regenerate this file: node bin/generate-json-schema-validation-suite-stories.mjs
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  collectJsonSchemaSampleCases,
} from "../utils/json-schema-samples-cases";
import { createSampleById } from "../utils/sample-cases";
import {
  JsonSchemaSampleStory,
  createCaseStoryFactory,
  jsonSchemaSamplesStoryMetaBase,
  type JsonSchemaSamplesStoryObj,
} from "./json-schema-samples-common";

const sampleFiles = import.meta.glob(
  "../../../../samples/json-schema/array-validations/*/sample.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleCases = collectJsonSchemaSampleCases(sampleFiles);
const sampleById = createSampleById(sampleCases);
const createCaseStory = createCaseStoryFactory(sampleById);

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...jsonSchemaSamplesStoryMetaBase,
  id: "json-schema-suite-array-validations",
  title: "JSON Schema Suite/Array And Validations/Array  Validations",
} satisfies Meta<typeof JsonSchemaSampleStory>;

export default meta;

type Story = JsonSchemaSamplesStoryObj;

export const Case_001_default_arbitrary_array: Story = createCaseStory("001-default-arbitrary-array");
export const Case_002_example_arbitrary_array: Story = createCaseStory("002-example-arbitrary-array");
export const Case_003_examples_two_items: Story = createCaseStory("003-examples-two-items");
export const Case_004_min_items_0: Story = createCaseStory("004-min-items-0");
export const Case_005_min_items_2: Story = createCaseStory("005-min-items-2");
export const Case_006_max_items_5: Story = createCaseStory("006-max-items-5");
export const Case_007_min_items_0_max_items_5: Story = createCaseStory("007-min-items-0-max-items-5");
export const Case_008_min_items_2_max_items_5: Story = createCaseStory("008-min-items-2-max-items-5");
export const Case_009_unique_items_false: Story = createCaseStory("009-unique-items-false");
export const Case_010_unique_items_true: Story = createCaseStory("010-unique-items-true");
