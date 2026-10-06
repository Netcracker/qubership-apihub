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
  "../../../../samples/json-schema/string-validations/*/sample.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleCases = collectJsonSchemaSampleCases(sampleFiles);
const sampleById = createSampleById(sampleCases);
const createCaseStory = createCaseStoryFactory(sampleById);

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...jsonSchemaSamplesStoryMetaBase,
  id: "json-schema-suite-string-validations",
  title: "JSON Schema Suite/String And Validations/String  Validations",
} satisfies Meta<typeof JsonSchemaSampleStory>;

export default meta;

type Story = JsonSchemaSamplesStoryObj;

export const Case_001_default_empty: Story = createCaseStory("001-default-empty");
export const Case_002_example_empty: Story = createCaseStory("002-example-empty");
export const Case_003_default_whitespaces: Story = createCaseStory("003-default-whitespaces");
export const Case_004_example_whitespaces: Story = createCaseStory("004-example-whitespaces");
export const Case_005_default_crlf: Story = createCaseStory("005-default-crlf");
export const Case_006_example_crlf: Story = createCaseStory("006-example-crlf");
export const Case_007_default_cr: Story = createCaseStory("007-default-cr");
export const Case_008_example_cr: Story = createCaseStory("008-example-cr");
export const Case_009_default_lf: Story = createCaseStory("009-default-lf");
export const Case_010_example_lf: Story = createCaseStory("010-example-lf");
export const Case_011_default_tab: Story = createCaseStory("011-default-tab");
export const Case_012_example_tab: Story = createCaseStory("012-example-tab");
export const Case_013_default_padded: Story = createCaseStory("013-default-padded");
export const Case_014_example_padded: Story = createCaseStory("014-example-padded");
export const Case_015_default_plain: Story = createCaseStory("015-default-plain");
export const Case_016_example_plain: Story = createCaseStory("016-example-plain");
export const Case_017_examples_all_samples: Story = createCaseStory("017-examples-all-samples");
export const Case_018_enum_all_samples: Story = createCaseStory("018-enum-all-samples");
export const Case_019_min_length_0: Story = createCaseStory("019-min-length-0");
export const Case_020_min_length_1: Story = createCaseStory("020-min-length-1");
export const Case_021_max_length_1: Story = createCaseStory("021-max-length-1");
export const Case_022_min_length_0_max_length_1: Story = createCaseStory("022-min-length-0-max-length-1");
export const Case_023_min_length_1_max_length_2: Story = createCaseStory("023-min-length-1-max-length-2");
export const Case_024_pattern_email: Story = createCaseStory("024-pattern-email");
