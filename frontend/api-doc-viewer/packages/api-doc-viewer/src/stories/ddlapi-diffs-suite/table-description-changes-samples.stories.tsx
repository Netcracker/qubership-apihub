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
  "../../../../samples/ddlapi-diffs/table-description-changes/*/before.sql",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/ddlapi-diffs/table-description-changes/*/after.sql",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleCases = collectDdlDiffSampleCases(beforeFiles, afterFiles);
const sampleById = createDdlDiffSampleById(sampleCases);

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...ddlDiffsSamplesStoryMetaBase,
  title: "DDL API Diffs Suite/Table Description Changes Samples",
} satisfies Meta<typeof DdlDiffSampleStory>;

export default meta;

type Story = DdlDiffsSamplesStoryObj;

const createCaseStory = createDdlDiffCaseStoryFactory(sampleById);

export const Case_01_add_table_description: Story = createCaseStory("01-add-table-description");
export const Case_02_remove_table_description: Story = createCaseStory("02-remove-table-description");
export const Case_03_replace_table_description: Story = createCaseStory("03-replace-table-description");
export const Case_04_add_long_table_description: Story = createCaseStory("04-add-long-table-description");
export const Case_05_remove_long_table_description: Story = createCaseStory("05-remove-long-table-description");
export const Case_06_replace_long_table_description: Story = createCaseStory("06-replace-long-table-description");
export const Case_07_replace_short_to_long_table_description: Story = createCaseStory("07-replace-short-to-long-table-description");
export const Case_08_replace_long_to_short_table_description: Story = createCaseStory("08-replace-long-to-short-table-description");
