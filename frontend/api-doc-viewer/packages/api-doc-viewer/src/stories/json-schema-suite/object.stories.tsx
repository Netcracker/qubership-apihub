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
  "../../../../samples/json-schema/object/*/sample.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleCases = collectJsonSchemaSampleCases(sampleFiles);
const sampleById = createSampleById(sampleCases);
const createCaseStory = createCaseStoryFactory(sampleById);

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...jsonSchemaSamplesStoryMetaBase,
  id: "json-schema-suite-object",
  title: "JSON Schema Suite/Object And Validations/Object",
} satisfies Meta<typeof JsonSchemaSampleStory>;

export default meta;

type Story = JsonSchemaSamplesStoryObj;

export const Case_001_type_only: Story = createCaseStory("001-type-only");
export const Case_002_header: Story = createCaseStory("002-header");
export const Case_003_description: Story = createCaseStory("003-description");
export const Case_004_header_description: Story = createCaseStory("004-header-description");
export const Case_005_properties: Story = createCaseStory("005-properties");
export const Case_006_header_properties: Story = createCaseStory("006-header-properties");
export const Case_007_description_properties: Story = createCaseStory("007-description-properties");
export const Case_008_header_description_properties: Story = createCaseStory("008-header-description-properties");
export const Case_009_additional_properties: Story = createCaseStory("009-additional-properties");
export const Case_010_header_additional_properties: Story = createCaseStory("010-header-additional-properties");
export const Case_011_description_additional_properties: Story = createCaseStory("011-description-additional-properties");
export const Case_012_header_description_additional_properties: Story = createCaseStory("012-header-description-additional-properties");
export const Case_013_properties_additional_properties: Story = createCaseStory("013-properties-additional-properties");
export const Case_014_header_properties_additional_properties: Story = createCaseStory("014-header-properties-additional-properties");
export const Case_015_description_properties_additional_properties: Story = createCaseStory("015-description-properties-additional-properties");
export const Case_016_header_description_properties_additional_properties: Story = createCaseStory("016-header-description-properties-additional-properties");
export const Case_017_additional_info: Story = createCaseStory("017-additional-info");
export const Case_018_header_additional_info: Story = createCaseStory("018-header-additional-info");
export const Case_019_description_additional_info: Story = createCaseStory("019-description-additional-info");
export const Case_020_header_description_additional_info: Story = createCaseStory("020-header-description-additional-info");
export const Case_021_properties_additional_info: Story = createCaseStory("021-properties-additional-info");
export const Case_022_header_properties_additional_info: Story = createCaseStory("022-header-properties-additional-info");
export const Case_023_description_properties_additional_info: Story = createCaseStory("023-description-properties-additional-info");
export const Case_024_header_description_properties_additional_info: Story = createCaseStory("024-header-description-properties-additional-info");
export const Case_025_additional_properties_additional_info: Story = createCaseStory("025-additional-properties-additional-info");
export const Case_026_header_additional_properties_additional_info: Story = createCaseStory("026-header-additional-properties-additional-info");
export const Case_027_description_additional_properties_additional_info: Story = createCaseStory("027-description-additional-properties-additional-info");
export const Case_028_header_description_additional_properties_additional_info: Story = createCaseStory("028-header-description-additional-properties-additional-info");
export const Case_029_properties_additional_properties_additional_info: Story = createCaseStory("029-properties-additional-properties-additional-info");
export const Case_030_header_properties_additional_properties_additional_info: Story = createCaseStory("030-header-properties-additional-properties-additional-info");
export const Case_031_description_properties_additional_properties_additional_info: Story = createCaseStory("031-description-properties-additional-properties-additional-info");
export const Case_032_header_description_properties_additional_properties_additional_info: Story = createCaseStory("032-header-description-properties-additional-properties-additional-info");
export const Case_033_additional_properties_true: Story = createCaseStory("033-additional-properties-true");
export const Case_034_additional_properties_false: Story = createCaseStory("034-additional-properties-false");
