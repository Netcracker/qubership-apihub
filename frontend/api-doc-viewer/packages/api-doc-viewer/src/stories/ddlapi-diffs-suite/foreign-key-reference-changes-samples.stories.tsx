import type { Meta } from "@storybook/react";
import {
  DdlDiffSampleStory,
  collectDdlDiffSampleCases,
  createDdlDiffCaseStoryFactory,
  createDdlDiffSampleById,
  ddlDiffsSamplesStoryMetaBase,
  type DdlDiffsSamplesStoryObj,
} from "./ddlapi-diffs-utils";

const beforeFiles = import.meta.glob(
  "../../../../samples/ddlapi-diffs/foreign-key-reference-changes/*/before.sql",
  { as: "raw", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/ddlapi-diffs/foreign-key-reference-changes/*/after.sql",
  { as: "raw", eager: true },
) as Record<string, string>;

const sampleCases = collectDdlDiffSampleCases(beforeFiles, afterFiles);
const sampleById = createDdlDiffSampleById(sampleCases);

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...ddlDiffsSamplesStoryMetaBase,
  title: "DDL API Diffs Suite/Foreign Key Reference Changes Samples",
} satisfies Meta<typeof DdlDiffSampleStory>;

export default meta;

type Story = DdlDiffsSamplesStoryObj;

const createCaseStory = createDdlDiffCaseStoryFactory(sampleById);

export const Case_01_replaced_foreign_key_column: Story = createCaseStory("01-replaced-foreign-key-column");
export const Case_02_replaced_foreign_key_table: Story = createCaseStory("02-replaced-foreign-key-table");
export const Case_03_replaced_foreign_key_schema_public_to_custom: Story = createCaseStory("03-replaced-foreign-key-schema-public-to-custom");
export const Case_04_replaced_foreign_key_schema_custom1_to_custom2: Story = createCaseStory("04-replaced-foreign-key-schema-custom1-to-custom2");
export const Case_05_replaced_foreign_key_schema_custom_to_public: Story = createCaseStory("05-replaced-foreign-key-schema-custom-to-public");
export const Case_06_replaced_foreign_key_table_and_column: Story = createCaseStory("06-replaced-foreign-key-table-and-column");
export const Case_07_replaced_foreign_key_schema_public_to_custom_and_table: Story = createCaseStory("07-replaced-foreign-key-schema-public-to-custom-and-table");
export const Case_08_replaced_foreign_key_schema_custom_to_public_and_table: Story = createCaseStory("08-replaced-foreign-key-schema-custom-to-public-and-table");
export const Case_09_replaced_foreign_key_schema_custom1_to_custom2_and_table: Story = createCaseStory("09-replaced-foreign-key-schema-custom1-to-custom2-and-table");
export const Case_10_replaced_foreign_key_schema_public_to_custom_table_and_column: Story = createCaseStory("10-replaced-foreign-key-schema-public-to-custom-table-and-column");
export const Case_11_replaced_foreign_key_schema_custom_to_public_table_and_column: Story = createCaseStory("11-replaced-foreign-key-schema-custom-to-public-table-and-column");
export const Case_12_replaced_foreign_key_schema_custom1_to_custom2_table_and_column: Story = createCaseStory("12-replaced-foreign-key-schema-custom1-to-custom2-table-and-column");
