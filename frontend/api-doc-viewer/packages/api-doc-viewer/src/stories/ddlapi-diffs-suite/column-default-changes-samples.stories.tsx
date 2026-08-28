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
  "../../../../samples/ddlapi-diffs/column-default-changes/*/before.sql",
  { as: "raw", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/ddlapi-diffs/column-default-changes/*/after.sql",
  { as: "raw", eager: true },
) as Record<string, string>;

const sampleCases = collectDdlDiffSampleCases(beforeFiles, afterFiles);
const sampleById = createDdlDiffSampleById(sampleCases);

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...ddlDiffsSamplesStoryMetaBase,
  title: "DDL API Diffs Suite/Column Default Changes Samples",
} satisfies Meta<typeof DdlDiffSampleStory>;

export default meta;

type Story = DdlDiffsSamplesStoryObj;

const createCaseStory = createDdlDiffCaseStoryFactory(sampleById);

export const Case_101_add_default_bigint: Story = createCaseStory("101-add-default-bigint");
export const Case_201_remove_default_bigint: Story = createCaseStory("201-remove-default-bigint");
export const Case_301_replace_default_bigint: Story = createCaseStory("301-replace-default-bigint");
export const Case_102_add_default_bit: Story = createCaseStory("102-add-default-bit");
export const Case_202_remove_default_bit: Story = createCaseStory("202-remove-default-bit");
export const Case_302_replace_default_bit: Story = createCaseStory("302-replace-default-bit");
export const Case_103_add_default_bit_varying: Story = createCaseStory("103-add-default-bit-varying");
export const Case_203_remove_default_bit_varying: Story = createCaseStory("203-remove-default-bit-varying");
export const Case_303_replace_default_bit_varying: Story = createCaseStory("303-replace-default-bit-varying");
export const Case_104_add_default_boolean: Story = createCaseStory("104-add-default-boolean");
export const Case_204_remove_default_boolean: Story = createCaseStory("204-remove-default-boolean");
export const Case_304_replace_default_boolean: Story = createCaseStory("304-replace-default-boolean");
export const Case_105_add_default_bytea: Story = createCaseStory("105-add-default-bytea");
export const Case_205_remove_default_bytea: Story = createCaseStory("205-remove-default-bytea");
export const Case_305_replace_default_bytea: Story = createCaseStory("305-replace-default-bytea");
export const Case_106_add_default_char: Story = createCaseStory("106-add-default-char");
export const Case_206_remove_default_char: Story = createCaseStory("206-remove-default-char");
export const Case_306_replace_default_char: Story = createCaseStory("306-replace-default-char");
export const Case_107_add_default_date: Story = createCaseStory("107-add-default-date");
export const Case_207_remove_default_date: Story = createCaseStory("207-remove-default-date");
export const Case_307_replace_default_date: Story = createCaseStory("307-replace-default-date");
export const Case_108_add_default_double_precision: Story = createCaseStory("108-add-default-double-precision");
export const Case_208_remove_default_double_precision: Story = createCaseStory("208-remove-default-double-precision");
export const Case_308_replace_default_double_precision: Story = createCaseStory("308-replace-default-double-precision");
export const Case_109_add_default_integer: Story = createCaseStory("109-add-default-integer");
export const Case_209_remove_default_integer: Story = createCaseStory("209-remove-default-integer");
export const Case_309_replace_default_integer: Story = createCaseStory("309-replace-default-integer");
export const Case_110_add_default_interval: Story = createCaseStory("110-add-default-interval");
export const Case_210_remove_default_interval: Story = createCaseStory("210-remove-default-interval");
export const Case_310_replace_default_interval: Story = createCaseStory("310-replace-default-interval");
export const Case_111_add_default_json: Story = createCaseStory("111-add-default-json");
export const Case_211_remove_default_json: Story = createCaseStory("211-remove-default-json");
export const Case_311_replace_default_json: Story = createCaseStory("311-replace-default-json");
export const Case_112_add_default_jsonb: Story = createCaseStory("112-add-default-jsonb");
export const Case_212_remove_default_jsonb: Story = createCaseStory("212-remove-default-jsonb");
export const Case_312_replace_default_jsonb: Story = createCaseStory("312-replace-default-jsonb");
export const Case_113_add_default_money: Story = createCaseStory("113-add-default-money");
export const Case_213_remove_default_money: Story = createCaseStory("213-remove-default-money");
export const Case_313_replace_default_money: Story = createCaseStory("313-replace-default-money");
export const Case_114_add_default_numeric: Story = createCaseStory("114-add-default-numeric");
export const Case_214_remove_default_numeric: Story = createCaseStory("214-remove-default-numeric");
export const Case_314_replace_default_numeric: Story = createCaseStory("314-replace-default-numeric");
export const Case_115_add_default_real: Story = createCaseStory("115-add-default-real");
export const Case_215_remove_default_real: Story = createCaseStory("215-remove-default-real");
export const Case_315_replace_default_real: Story = createCaseStory("315-replace-default-real");
export const Case_116_add_default_smallint: Story = createCaseStory("116-add-default-smallint");
export const Case_216_remove_default_smallint: Story = createCaseStory("216-remove-default-smallint");
export const Case_316_replace_default_smallint: Story = createCaseStory("316-replace-default-smallint");
export const Case_117_add_default_text: Story = createCaseStory("117-add-default-text");
export const Case_217_remove_default_text: Story = createCaseStory("217-remove-default-text");
export const Case_317_replace_default_text: Story = createCaseStory("317-replace-default-text");
export const Case_118_add_default_time: Story = createCaseStory("118-add-default-time");
export const Case_218_remove_default_time: Story = createCaseStory("218-remove-default-time");
export const Case_318_replace_default_time: Story = createCaseStory("318-replace-default-time");
export const Case_119_add_default_timetz: Story = createCaseStory("119-add-default-timetz");
export const Case_219_remove_default_timetz: Story = createCaseStory("219-remove-default-timetz");
export const Case_319_replace_default_timetz: Story = createCaseStory("319-replace-default-timetz");
export const Case_120_add_default_timestamp: Story = createCaseStory("120-add-default-timestamp");
export const Case_220_remove_default_timestamp: Story = createCaseStory("220-remove-default-timestamp");
export const Case_320_replace_default_timestamp: Story = createCaseStory("320-replace-default-timestamp");
export const Case_121_add_default_timestamptz: Story = createCaseStory("121-add-default-timestamptz");
export const Case_221_remove_default_timestamptz: Story = createCaseStory("221-remove-default-timestamptz");
export const Case_321_replace_default_timestamptz: Story = createCaseStory("321-replace-default-timestamptz");
export const Case_122_add_default_uuid: Story = createCaseStory("122-add-default-uuid");
export const Case_222_remove_default_uuid: Story = createCaseStory("222-remove-default-uuid");
export const Case_322_replace_default_uuid: Story = createCaseStory("322-replace-default-uuid");
export const Case_123_add_default_varchar: Story = createCaseStory("123-add-default-varchar");
export const Case_223_remove_default_varchar: Story = createCaseStory("223-remove-default-varchar");
export const Case_323_replace_default_varchar: Story = createCaseStory("323-replace-default-varchar");
export const Case_124_add_default_enum: Story = createCaseStory("124-add-default-enum");
export const Case_224_remove_default_enum: Story = createCaseStory("224-remove-default-enum");
export const Case_324_replace_default_enum: Story = createCaseStory("324-replace-default-enum");
export const Case_125_add_default_varchar_raw_expr: Story = createCaseStory("125-add-default-varchar-raw-expr");
export const Case_225_remove_default_varchar_raw_expr: Story = createCaseStory("225-remove-default-varchar-raw-expr");
export const Case_325_replace_default_varchar_raw_expr: Story = createCaseStory("325-replace-default-varchar-raw-expr");
