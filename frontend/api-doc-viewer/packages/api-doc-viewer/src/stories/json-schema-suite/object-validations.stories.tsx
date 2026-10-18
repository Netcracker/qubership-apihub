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
  "../../../../samples/json-schema/object-validations/*/sample.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleCases = collectJsonSchemaSampleCases(sampleFiles);
const sampleById = createSampleById(sampleCases);
const createCaseStory = createCaseStoryFactory(sampleById);

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...jsonSchemaSamplesStoryMetaBase,
  id: "json-schema-suite-object-validations",
  title: "JSON Schema Suite/Object And Validations/Object  Validations",
} satisfies Meta<typeof JsonSchemaSampleStory>;

export default meta;

type Story = JsonSchemaSamplesStoryObj;

export const Case_001_default_empty_object: Story = createCaseStory("001-default-empty-object");
export const Case_002_default_small_object: Story = createCaseStory("002-default-small-object");
export const Case_003_example_empty_object: Story = createCaseStory("003-example-empty-object");
export const Case_004_example_small_object: Story = createCaseStory("004-example-small-object");
export const Case_005_examples_empty_object: Story = createCaseStory("005-examples-empty-object");
export const Case_006_examples_small_object: Story = createCaseStory("006-examples-small-object");
export const Case_007_examples_two_objects: Story = createCaseStory("007-examples-two-objects");
export const Case_008_min_properties_0: Story = createCaseStory("008-min-properties-0");
export const Case_009_min_properties_1: Story = createCaseStory("009-min-properties-1");
export const Case_010_max_properties_1: Story = createCaseStory("010-max-properties-1");
