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
  "../../../../samples/ddlapi-diffs/whole-table-changes/*/before.sql",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/ddlapi-diffs/whole-table-changes/*/after.sql",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const sampleCases = collectDdlDiffSampleCases(beforeFiles, afterFiles);
const sampleById = createDdlDiffSampleById(sampleCases);

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...ddlDiffsSamplesStoryMetaBase,
  title: "DDL API Diffs Suite/Whole Table Changes Samples",
} satisfies Meta<typeof DdlDiffSampleStory>;

export default meta;

type Story = DdlDiffsSamplesStoryObj;

const createCaseStory = createDdlDiffCaseStoryFactory(sampleById);

export const Case_01_wholly_added_table: Story = createCaseStory("01-wholly-added-table");
export const Case_02_wholly_removed_table: Story = createCaseStory("02-wholly-removed-table");
export const Case_03_wholly_added_table_with_index: Story = createCaseStory("03-wholly-added-table-with-index");
export const Case_04_wholly_removed_table_with_index: Story = createCaseStory("04-wholly-removed-table-with-index");
