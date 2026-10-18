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
  "../../../../samples/json-schema/performance-tests/*/sample.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleCases = collectJsonSchemaSampleCases(sampleFiles);
const sampleById = createSampleById(sampleCases);
const createCaseStory = createCaseStoryFactory(sampleById);

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...jsonSchemaSamplesStoryMetaBase,
  id: "json-schema-performance-suite-performance-tests",
  title: "JSON Schema Suite (Performance)/Performance Tests",
} satisfies Meta<typeof JsonSchemaSampleStory>;

export default meta;

type Story = JsonSchemaSamplesStoryObj;

export const Case_001_loket_concept_employees_list_response: Story = createCaseStory(
  "001-loket-concept-employees-list-response",
);
