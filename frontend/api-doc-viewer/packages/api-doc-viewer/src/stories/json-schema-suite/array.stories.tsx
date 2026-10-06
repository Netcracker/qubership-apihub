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
} from "./json-schema-samples-common"

const sampleFiles = import.meta.glob(
  "../../../../samples/json-schema/array/*/sample.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleCases = collectJsonSchemaSampleCases(sampleFiles);
const sampleById = createSampleById(sampleCases);
const createCaseStory = createCaseStoryFactory(sampleById);

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...jsonSchemaSamplesStoryMetaBase,
  id: "json-schema-suite-array",
  title: "JSON Schema Suite/Array And Validations/Array",
} satisfies Meta<typeof JsonSchemaSampleStory>;

export default meta;

type Story = JsonSchemaSamplesStoryObj;

export const Case_001_type_only: Story = createCaseStory("001-type-only");
export const Case_002_header: Story = createCaseStory("002-header");
export const Case_003_description: Story = createCaseStory("003-description");
export const Case_004_header_description: Story = createCaseStory("004-header-description");
export const Case_005_items: Story = createCaseStory("005-items");
export const Case_006_header_items: Story = createCaseStory("006-header-items");
export const Case_007_description_items: Story = createCaseStory("007-description-items");
export const Case_008_header_description_items: Story = createCaseStory("008-header-description-items");
export const Case_009_additional_items: Story = createCaseStory("009-additional-items");
export const Case_010_header_additional_items: Story = createCaseStory("010-header-additional-items");
export const Case_011_description_additional_items: Story = createCaseStory("011-description-additional-items");
export const Case_012_header_description_additional_items: Story = createCaseStory("012-header-description-additional-items");
export const Case_013_additional_info: Story = createCaseStory("013-additional-info");
export const Case_014_header_additional_info: Story = createCaseStory("014-header-additional-info");
export const Case_015_description_additional_info: Story = createCaseStory("015-description-additional-info");
export const Case_016_header_description_additional_info: Story = createCaseStory("016-header-description-additional-info");
export const Case_017_items_additional_info: Story = createCaseStory("017-items-additional-info");
export const Case_018_header_items_additional_info: Story = createCaseStory("018-header-items-additional-info");
export const Case_019_description_items_additional_info: Story = createCaseStory("019-description-items-additional-info");
export const Case_020_header_description_items_additional_info: Story = createCaseStory("020-header-description-items-additional-info");
export const Case_021_additional_items_additional_info: Story = createCaseStory("021-additional-items-additional-info");
export const Case_022_header_additional_items_additional_info: Story = createCaseStory("022-header-additional-items-additional-info");
export const Case_023_description_additional_items_additional_info: Story = createCaseStory("023-description-additional-items-additional-info");
export const Case_024_header_description_additional_items_additional_info: Story = createCaseStory("024-header-description-additional-items-additional-info");
