import type { Meta } from "@storybook/react-vite";
import {
  DdlDiffSampleStory,
  collectDdlDiffSampleCases,
  createDdlDiffCaseStoryFactory,
  createDdlDiffSampleById,
  ddlDiffsSamplesStoryMetaBase,
  type DdlDiffsSamplesStoryObj,
} from "./ddlapi-diffs-utils";

const beforeFiles = import.meta.glob(
  "../../../../samples/ddlapi-diffs/index-changes/*/before.sql",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/ddlapi-diffs/index-changes/*/after.sql",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleCases = collectDdlDiffSampleCases(beforeFiles, afterFiles);
const sampleById = createDdlDiffSampleById(sampleCases);

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...ddlDiffsSamplesStoryMetaBase,
  title: "DDL API Diffs Suite/Index Changes Samples",
} satisfies Meta<typeof DdlDiffSampleStory>;

export default meta;

type Story = DdlDiffsSamplesStoryObj;

const createCaseStory = createDdlDiffCaseStoryFactory(sampleById);

export const Case_01_add_index_when_none_present: Story = createCaseStory("01-add-index-when-none-present");
export const Case_02_add_index_unique_when_none_present: Story = createCaseStory("02-add-index-unique-when-none-present");
export const Case_03_remove_index_when_none_present: Story = createCaseStory("03-remove-index-when-none-present");
export const Case_04_remove_index_unique_when_none_present: Story = createCaseStory("04-remove-index-unique-when-none-present");
export const Case_05_add_one_more_index_without_unique: Story = createCaseStory("05-add-one-more-index-without-unique");
export const Case_06_add_one_more_index_with_unique: Story = createCaseStory("06-add-one-more-index-with-unique");
export const Case_07_remove_one_more_index_without_unique: Story = createCaseStory("07-remove-one-more-index-without-unique");
export const Case_08_remove_one_more_index_with_unique: Story = createCaseStory("08-remove-one-more-index-with-unique");
export const Case_09_append_new_column_in_index: Story = createCaseStory("09-append-new-column-in-index");
export const Case_10_remove_new_column_in_index: Story = createCaseStory("10-remove-new-column-in-index");
export const Case_11_replaced_column_in_index: Story = createCaseStory("11-replaced-column-in-index");
export const Case_12_index_became_unique: Story = createCaseStory("12-index-became-unique");
export const Case_13_index_lost_unique: Story = createCaseStory("13-index-lost-unique");
export const Case_14_remove_one_more_index_without_unique: Story = createCaseStory("14-remove-one-more-index-without-unique");
export const Case_15_remove_one_more_index_with_unique: Story = createCaseStory("15-remove-one-more-index-with-unique");
export const Case_16_remove_new_column_in_index: Story = createCaseStory("16-remove-new-column-in-index");
export const Case_17_unnamed_index_became_titled: Story = createCaseStory("17-unnamed-index-became-titled");
export const Case_18_titled_index_became_unnamed: Story = createCaseStory("18-titled-index-became-unnamed");
export const Case_19_unnamed_index_append_column: Story = createCaseStory("19-unnamed-index-append-column");
export const Case_20_unnamed_index_pop_column: Story = createCaseStory("20-unnamed-index-pop-column");
export const Case_21_unnamed_index_replaced_column: Story = createCaseStory("21-unnamed-index-replaced-column");
export const Case_22_unnamed_index_became_unique: Story = createCaseStory("22-unnamed-index-became-unique");
export const Case_23_unnamed_index_lost_unique: Story = createCaseStory("23-unnamed-index-lost-unique");
export const Case_24_add_index_description: Story = createCaseStory("24-add-index-description");
export const Case_25_remove_index_description: Story = createCaseStory("25-remove-index-description");
export const Case_26_replace_index_description: Story = createCaseStory("26-replace-index-description");
