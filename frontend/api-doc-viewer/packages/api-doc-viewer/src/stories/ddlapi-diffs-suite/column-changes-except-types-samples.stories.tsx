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
  "../../../../samples/ddlapi-diffs/column-changes-except-types/*/before.sql",
  { as: "raw", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/ddlapi-diffs/column-changes-except-types/*/after.sql",
  { as: "raw", eager: true },
) as Record<string, string>;

const sampleCases = collectDdlDiffSampleCases(beforeFiles, afterFiles);
const sampleById = createDdlDiffSampleById(sampleCases);

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...ddlDiffsSamplesStoryMetaBase,
  title: "DDL API Diffs Suite/Column Changes Except Types Samples",
} satisfies Meta<typeof DdlDiffSampleStory>;

export default meta;

type Story = DdlDiffsSamplesStoryObj;

const createCaseStory = createDdlDiffCaseStoryFactory(sampleById);

export const Case_101_add_one_more_column_no_badges: Story = createCaseStory("101-add-one-more-column-no-badges");
export const Case_102_remove_one_more_column_no_badges: Story = createCaseStory("102-remove-one-more-column-no-badges");
export const Case_201_add_column_primary_key: Story = createCaseStory("201-add-column-primary-key");
export const Case_202_add_column_foreign_key: Story = createCaseStory("202-add-column-foreign-key");
export const Case_203_add_column_unique: Story = createCaseStory("203-add-column-unique");
export const Case_204_add_column_not_null: Story = createCaseStory("204-add-column-not-null");
export const Case_205_add_column_generated_identity: Story = createCaseStory("205-add-column-generated-identity");
export const Case_206_add_column_generated_expression: Story = createCaseStory("206-add-column-generated-expression");
export const Case_207_add_column_description: Story = createCaseStory("207-add-column-description");
export const Case_301_remove_column_primary_key: Story = createCaseStory("301-remove-column-primary-key");
export const Case_302_remove_column_foreign_key: Story = createCaseStory("302-remove-column-foreign-key");
export const Case_303_remove_column_unique: Story = createCaseStory("303-remove-column-unique");
export const Case_304_remove_column_not_null: Story = createCaseStory("304-remove-column-not-null");
export const Case_305_remove_column_generated_identity: Story = createCaseStory("305-remove-column-generated-identity");
export const Case_306_remove_column_generated_expression: Story = createCaseStory("306-remove-column-generated-expression");
export const Case_307_remove_column_description: Story = createCaseStory("307-remove-column-description");
export const Case_401_existing_column_became_primary_key: Story = createCaseStory("401-existing-column-became-primary-key");
export const Case_402_existing_column_became_foreign_key: Story = createCaseStory("402-existing-column-became-foreign-key");
export const Case_403_existing_column_became_unique: Story = createCaseStory("403-existing-column-became-unique");
export const Case_404_existing_column_became_generated_identity: Story = createCaseStory("404-existing-column-became-generated-identity");
export const Case_405_existing_column_became_generated_expression: Story = createCaseStory("405-existing-column-became-generated-expression");
export const Case_406_existing_column_became_not_null: Story = createCaseStory("406-existing-column-became-not-null");
export const Case_407_existing_column_gained_description: Story = createCaseStory("407-existing-column-gained-description");
export const Case_501_existing_column_lost_primary_key: Story = createCaseStory("501-existing-column-lost-primary-key");
export const Case_502_existing_column_lost_foreign_key: Story = createCaseStory("502-existing-column-lost-foreign-key");
export const Case_503_existing_column_lost_unique: Story = createCaseStory("503-existing-column-lost-unique");
export const Case_504_existing_column_lost_generated_identity: Story = createCaseStory("504-existing-column-lost-generated-identity");
export const Case_505_existing_column_lost_generated_expression: Story = createCaseStory("505-existing-column-lost-generated-expression");
export const Case_506_existing_column_lost_not_null: Story = createCaseStory("506-existing-column-lost-not-null");
export const Case_507_existing_column_lost_description: Story = createCaseStory("507-existing-column-lost-description");
export const Case_601_existing_column_replaced_generated_expression: Story = createCaseStory("601-existing-column-replaced-generated-expression");
export const Case_602_existing_column_generated_expression_became_identity: Story = createCaseStory("602-existing-column-generated-expression-became-identity");
export const Case_603_existing_column_generated_identity_became_expression: Story = createCaseStory("603-existing-column-generated-identity-became-expression");
export const Case_604_existing_column_replaced_description: Story = createCaseStory("604-existing-column-replaced-description");
