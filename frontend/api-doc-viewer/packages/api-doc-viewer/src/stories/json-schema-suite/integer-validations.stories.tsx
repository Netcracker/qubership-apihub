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
  "../../../../samples/json-schema/integer-validations/*/sample.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleCases = collectJsonSchemaSampleCases(sampleFiles);
const sampleById = createSampleById(sampleCases);
const createCaseStory = createCaseStoryFactory(sampleById);

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...jsonSchemaSamplesStoryMetaBase,
  id: "json-schema-suite-integer-validations",
  title: "JSON Schema Suite/Integer  Validations",
} satisfies Meta<typeof JsonSchemaSampleStory>;

export default meta;

type Story = JsonSchemaSamplesStoryObj;

export const Case_001_default_0: Story = createCaseStory("001-default-0");
export const Case_002_example_0: Story = createCaseStory("002-example-0");
export const Case_003_default_1: Story = createCaseStory("003-default-1");
export const Case_004_example_1: Story = createCaseStory("004-example-1");
export const Case_005_default__1: Story = createCaseStory("005-default--1");
export const Case_006_example__1: Story = createCaseStory("006-example--1");
export const Case_007_examples_0: Story = createCaseStory("007-examples-0");
export const Case_008_examples_1: Story = createCaseStory("008-examples-1");
export const Case_009_examples_minus_1: Story = createCaseStory("009-examples-minus-1");
export const Case_010_examples_minus_1_0_1: Story = createCaseStory("010-examples-minus-1-0-1");
export const Case_011_multiple_of_0: Story = createCaseStory("011-multiple-of-0");
export const Case_012_multiple_of_1: Story = createCaseStory("012-multiple-of-1");
export const Case_013_multiple_of__1: Story = createCaseStory("013-multiple-of--1");
