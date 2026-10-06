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
} from "../json-schema-suite/json-schema-samples-common";

const sampleFiles = import.meta.glob(
  "../../../../samples/json-schema/extensions/*/sample.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleCases = collectJsonSchemaSampleCases(sampleFiles);
const sampleById = createSampleById(sampleCases);
const createCaseStory = createCaseStoryFactory(sampleById);

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...jsonSchemaSamplesStoryMetaBase,
  id: "json-schema-extensions-suite-extensions",
  title: "JSON Schema Suite (Extensions)/Extensions",
} satisfies Meta<typeof JsonSchemaSampleStory>;

export default meta;

type Story = JsonSchemaSamplesStoryObj;

export const Case_001_root_primitive: Story = createCaseStory("001-root-primitive");
export const Case_002_root_object: Story = createCaseStory("002-root-object");
export const Case_003_root_array: Story = createCaseStory("003-root-array");
export const Case_004_root_json_schema: Story = createCaseStory("004-root-json-schema");
export const Case_005_property_primitive: Story = createCaseStory("005-property-primitive");
export const Case_006_property_object: Story = createCaseStory("006-property-object");
export const Case_007_property_array: Story = createCaseStory("007-property-array");
export const Case_008_property_json_schema: Story = createCaseStory("008-property-json-schema");
export const Case_009_items_primitive: Story = createCaseStory("009-items-primitive");
export const Case_010_items_object: Story = createCaseStory("010-items-object");
export const Case_011_items_array: Story = createCaseStory("011-items-array");
export const Case_012_items_json_schema: Story = createCaseStory("012-items-json-schema");
export const Case_013_root_mixed_set: Story = createCaseStory("013-root-mixed-set");
