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
  "../../../../samples/ddlapi-diffs/column-type-changes/*/before.sql",
  { as: "raw", eager: true },
) as Record<string, string>;

const afterFiles = import.meta.glob(
  "../../../../samples/ddlapi-diffs/column-type-changes/*/after.sql",
  { as: "raw", eager: true },
) as Record<string, string>;

const sampleCases = collectDdlDiffSampleCases(beforeFiles, afterFiles);
const sampleById = createDdlDiffSampleById(sampleCases);

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...ddlDiffsSamplesStoryMetaBase,
  title: "DDL API Diffs Suite/Column Type Changes Samples",
} satisfies Meta<typeof DdlDiffSampleStory>;

export default meta;

type Story = DdlDiffsSamplesStoryObj;

const createCaseStory = createDdlDiffCaseStoryFactory(sampleById);

export const Case_001_type_change_int4_to_bigint: Story = createCaseStory("001-type-change-int4-to-bigint");
export const Case_002_type_change_int4_to_boolean: Story = createCaseStory("002-type-change-int4-to-boolean");
export const Case_003_type_change_int4_to_uuid: Story = createCaseStory("003-type-change-int4-to-uuid");
export const Case_004_type_change_int4_to_varchar: Story = createCaseStory("004-type-change-int4-to-varchar");
export const Case_005_type_change_int4_to_text: Story = createCaseStory("005-type-change-int4-to-text");
export const Case_006_type_change_int4_to_numeric: Story = createCaseStory("006-type-change-int4-to-numeric");
export const Case_007_type_change_int4_to_timestamp: Story = createCaseStory("007-type-change-int4-to-timestamp");
export const Case_008_type_change_int4_to_bytea: Story = createCaseStory("008-type-change-int4-to-bytea");
export const Case_009_type_change_int4_to_jsonb: Story = createCaseStory("009-type-change-int4-to-jsonb");
export const Case_010_type_change_bigint_to_int4: Story = createCaseStory("010-type-change-bigint-to-int4");
export const Case_011_type_change_bigint_to_boolean: Story = createCaseStory("011-type-change-bigint-to-boolean");
export const Case_012_type_change_bigint_to_uuid: Story = createCaseStory("012-type-change-bigint-to-uuid");
export const Case_013_type_change_bigint_to_varchar: Story = createCaseStory("013-type-change-bigint-to-varchar");
export const Case_014_type_change_bigint_to_text: Story = createCaseStory("014-type-change-bigint-to-text");
export const Case_015_type_change_bigint_to_numeric: Story = createCaseStory("015-type-change-bigint-to-numeric");
export const Case_016_type_change_bigint_to_timestamp: Story = createCaseStory("016-type-change-bigint-to-timestamp");
export const Case_017_type_change_bigint_to_bytea: Story = createCaseStory("017-type-change-bigint-to-bytea");
export const Case_018_type_change_bigint_to_jsonb: Story = createCaseStory("018-type-change-bigint-to-jsonb");
export const Case_019_type_change_boolean_to_int4: Story = createCaseStory("019-type-change-boolean-to-int4");
export const Case_020_type_change_boolean_to_bigint: Story = createCaseStory("020-type-change-boolean-to-bigint");
export const Case_021_type_change_boolean_to_uuid: Story = createCaseStory("021-type-change-boolean-to-uuid");
export const Case_022_type_change_boolean_to_varchar: Story = createCaseStory("022-type-change-boolean-to-varchar");
export const Case_023_type_change_boolean_to_text: Story = createCaseStory("023-type-change-boolean-to-text");
export const Case_024_type_change_boolean_to_numeric: Story = createCaseStory("024-type-change-boolean-to-numeric");
export const Case_025_type_change_boolean_to_timestamp: Story = createCaseStory("025-type-change-boolean-to-timestamp");
export const Case_026_type_change_boolean_to_bytea: Story = createCaseStory("026-type-change-boolean-to-bytea");
export const Case_027_type_change_boolean_to_jsonb: Story = createCaseStory("027-type-change-boolean-to-jsonb");
export const Case_028_type_change_uuid_to_int4: Story = createCaseStory("028-type-change-uuid-to-int4");
export const Case_029_type_change_uuid_to_bigint: Story = createCaseStory("029-type-change-uuid-to-bigint");
export const Case_030_type_change_uuid_to_boolean: Story = createCaseStory("030-type-change-uuid-to-boolean");
export const Case_031_type_change_uuid_to_varchar: Story = createCaseStory("031-type-change-uuid-to-varchar");
export const Case_032_type_change_uuid_to_text: Story = createCaseStory("032-type-change-uuid-to-text");
export const Case_033_type_change_uuid_to_numeric: Story = createCaseStory("033-type-change-uuid-to-numeric");
export const Case_034_type_change_uuid_to_timestamp: Story = createCaseStory("034-type-change-uuid-to-timestamp");
export const Case_035_type_change_uuid_to_bytea: Story = createCaseStory("035-type-change-uuid-to-bytea");
export const Case_036_type_change_uuid_to_jsonb: Story = createCaseStory("036-type-change-uuid-to-jsonb");
export const Case_037_type_change_varchar_to_int4: Story = createCaseStory("037-type-change-varchar-to-int4");
export const Case_038_type_change_varchar_to_bigint: Story = createCaseStory("038-type-change-varchar-to-bigint");
export const Case_039_type_change_varchar_to_boolean: Story = createCaseStory("039-type-change-varchar-to-boolean");
export const Case_040_type_change_varchar_to_uuid: Story = createCaseStory("040-type-change-varchar-to-uuid");
export const Case_041_type_change_varchar_to_text: Story = createCaseStory("041-type-change-varchar-to-text");
export const Case_042_type_change_varchar_to_numeric: Story = createCaseStory("042-type-change-varchar-to-numeric");
export const Case_043_type_change_varchar_to_timestamp: Story = createCaseStory("043-type-change-varchar-to-timestamp");
export const Case_044_type_change_varchar_to_bytea: Story = createCaseStory("044-type-change-varchar-to-bytea");
export const Case_045_type_change_varchar_to_jsonb: Story = createCaseStory("045-type-change-varchar-to-jsonb");
export const Case_046_type_change_text_to_int4: Story = createCaseStory("046-type-change-text-to-int4");
export const Case_047_type_change_text_to_bigint: Story = createCaseStory("047-type-change-text-to-bigint");
export const Case_048_type_change_text_to_boolean: Story = createCaseStory("048-type-change-text-to-boolean");
export const Case_049_type_change_text_to_uuid: Story = createCaseStory("049-type-change-text-to-uuid");
export const Case_050_type_change_text_to_varchar: Story = createCaseStory("050-type-change-text-to-varchar");
export const Case_051_type_change_text_to_numeric: Story = createCaseStory("051-type-change-text-to-numeric");
export const Case_052_type_change_text_to_timestamp: Story = createCaseStory("052-type-change-text-to-timestamp");
export const Case_053_type_change_text_to_bytea: Story = createCaseStory("053-type-change-text-to-bytea");
export const Case_054_type_change_text_to_jsonb: Story = createCaseStory("054-type-change-text-to-jsonb");
export const Case_055_type_change_numeric_to_int4: Story = createCaseStory("055-type-change-numeric-to-int4");
export const Case_056_type_change_numeric_to_bigint: Story = createCaseStory("056-type-change-numeric-to-bigint");
export const Case_057_type_change_numeric_to_boolean: Story = createCaseStory("057-type-change-numeric-to-boolean");
export const Case_058_type_change_numeric_to_uuid: Story = createCaseStory("058-type-change-numeric-to-uuid");
export const Case_059_type_change_numeric_to_varchar: Story = createCaseStory("059-type-change-numeric-to-varchar");
export const Case_060_type_change_numeric_to_text: Story = createCaseStory("060-type-change-numeric-to-text");
export const Case_061_type_change_numeric_to_timestamp: Story = createCaseStory("061-type-change-numeric-to-timestamp");
export const Case_062_type_change_numeric_to_bytea: Story = createCaseStory("062-type-change-numeric-to-bytea");
export const Case_063_type_change_numeric_to_jsonb: Story = createCaseStory("063-type-change-numeric-to-jsonb");
export const Case_064_type_change_timestamp_to_int4: Story = createCaseStory("064-type-change-timestamp-to-int4");
export const Case_065_type_change_timestamp_to_bigint: Story = createCaseStory("065-type-change-timestamp-to-bigint");
export const Case_066_type_change_timestamp_to_boolean: Story = createCaseStory("066-type-change-timestamp-to-boolean");
export const Case_067_type_change_timestamp_to_uuid: Story = createCaseStory("067-type-change-timestamp-to-uuid");
export const Case_068_type_change_timestamp_to_varchar: Story = createCaseStory("068-type-change-timestamp-to-varchar");
export const Case_069_type_change_timestamp_to_text: Story = createCaseStory("069-type-change-timestamp-to-text");
export const Case_070_type_change_timestamp_to_numeric: Story = createCaseStory("070-type-change-timestamp-to-numeric");
export const Case_071_type_change_timestamp_to_bytea: Story = createCaseStory("071-type-change-timestamp-to-bytea");
export const Case_072_type_change_timestamp_to_jsonb: Story = createCaseStory("072-type-change-timestamp-to-jsonb");
export const Case_073_type_change_bytea_to_int4: Story = createCaseStory("073-type-change-bytea-to-int4");
export const Case_074_type_change_bytea_to_bigint: Story = createCaseStory("074-type-change-bytea-to-bigint");
export const Case_075_type_change_bytea_to_boolean: Story = createCaseStory("075-type-change-bytea-to-boolean");
export const Case_076_type_change_bytea_to_uuid: Story = createCaseStory("076-type-change-bytea-to-uuid");
export const Case_077_type_change_bytea_to_varchar: Story = createCaseStory("077-type-change-bytea-to-varchar");
export const Case_078_type_change_bytea_to_text: Story = createCaseStory("078-type-change-bytea-to-text");
export const Case_079_type_change_bytea_to_numeric: Story = createCaseStory("079-type-change-bytea-to-numeric");
export const Case_080_type_change_bytea_to_timestamp: Story = createCaseStory("080-type-change-bytea-to-timestamp");
export const Case_081_type_change_bytea_to_jsonb: Story = createCaseStory("081-type-change-bytea-to-jsonb");
export const Case_082_type_change_jsonb_to_int4: Story = createCaseStory("082-type-change-jsonb-to-int4");
export const Case_083_type_change_jsonb_to_bigint: Story = createCaseStory("083-type-change-jsonb-to-bigint");
export const Case_084_type_change_jsonb_to_boolean: Story = createCaseStory("084-type-change-jsonb-to-boolean");
export const Case_085_type_change_jsonb_to_uuid: Story = createCaseStory("085-type-change-jsonb-to-uuid");
export const Case_086_type_change_jsonb_to_varchar: Story = createCaseStory("086-type-change-jsonb-to-varchar");
export const Case_087_type_change_jsonb_to_text: Story = createCaseStory("087-type-change-jsonb-to-text");
export const Case_088_type_change_jsonb_to_numeric: Story = createCaseStory("088-type-change-jsonb-to-numeric");
export const Case_089_type_change_jsonb_to_timestamp: Story = createCaseStory("089-type-change-jsonb-to-timestamp");
export const Case_090_type_change_jsonb_to_bytea: Story = createCaseStory("090-type-change-jsonb-to-bytea");
export const Case_091_param_varchar_length_change_1st: Story = createCaseStory("091-param-varchar-length-change-1st");
export const Case_092_param_varchar_length_change_wide: Story = createCaseStory("092-param-varchar-length-change-wide");
export const Case_093_param_varchar_add_optional_parameter: Story = createCaseStory("093-param-varchar-add-optional-parameter");
export const Case_094_param_varchar_remove_optional_parameter: Story = createCaseStory("094-param-varchar-remove-optional-parameter");
export const Case_095_param_bit_length_change_1st: Story = createCaseStory("095-param-bit-length-change-1st");
export const Case_096_param_bit_varying_length_change_1st: Story = createCaseStory("096-param-bit-varying-length-change-1st");
export const Case_097_param_bit_add_optional_parameter: Story = createCaseStory("097-param-bit-add-optional-parameter");
export const Case_098_param_bit_remove_optional_parameter: Story = createCaseStory("098-param-bit-remove-optional-parameter");
export const Case_099_param_decimal_change_precision_only: Story = createCaseStory("099-param-decimal-change-precision-only");
export const Case_100_param_decimal_change_scale_only: Story = createCaseStory("100-param-decimal-change-scale-only");
export const Case_101_param_decimal_change_precision_and_scale: Story = createCaseStory("101-param-decimal-change-precision-and-scale");
export const Case_102_param_decimal_add_optional_scale: Story = createCaseStory("102-param-decimal-add-optional-scale");
export const Case_103_param_decimal_remove_optional_scale: Story = createCaseStory("103-param-decimal-remove-optional-scale");
export const Case_104_enum_enum_append_value: Story = createCaseStory("104-enum-enum-append-value");
export const Case_105_enum_enum_remove_value: Story = createCaseStory("105-enum-enum-remove-value");
export const Case_106_enum_enum_change_value: Story = createCaseStory("106-enum-enum-change-value");
export const Case_107_enum_enum_change_type_title: Story = createCaseStory("107-enum-enum-change-type-title");
export const Case_108_type_change_int4_to_enum: Story = createCaseStory("108-type-change-int4-to-enum");
export const Case_109_type_change_bigint_to_enum: Story = createCaseStory("109-type-change-bigint-to-enum");
export const Case_110_type_change_boolean_to_enum: Story = createCaseStory("110-type-change-boolean-to-enum");
export const Case_111_type_change_uuid_to_enum: Story = createCaseStory("111-type-change-uuid-to-enum");
export const Case_112_type_change_varchar_to_enum: Story = createCaseStory("112-type-change-varchar-to-enum");
export const Case_113_type_change_text_to_enum: Story = createCaseStory("113-type-change-text-to-enum");
export const Case_114_type_change_numeric_to_enum: Story = createCaseStory("114-type-change-numeric-to-enum");
export const Case_115_type_change_timestamp_to_enum: Story = createCaseStory("115-type-change-timestamp-to-enum");
export const Case_116_type_change_bytea_to_enum: Story = createCaseStory("116-type-change-bytea-to-enum");
export const Case_117_type_change_jsonb_to_enum: Story = createCaseStory("117-type-change-jsonb-to-enum");
export const Case_118_type_change_enum_to_int4: Story = createCaseStory("118-type-change-enum-to-int4");
export const Case_119_type_change_enum_to_bigint: Story = createCaseStory("119-type-change-enum-to-bigint");
export const Case_120_type_change_enum_to_boolean: Story = createCaseStory("120-type-change-enum-to-boolean");
export const Case_121_type_change_enum_to_uuid: Story = createCaseStory("121-type-change-enum-to-uuid");
export const Case_122_type_change_enum_to_varchar: Story = createCaseStory("122-type-change-enum-to-varchar");
export const Case_123_type_change_enum_to_text: Story = createCaseStory("123-type-change-enum-to-text");
export const Case_124_type_change_enum_to_numeric: Story = createCaseStory("124-type-change-enum-to-numeric");
export const Case_125_type_change_enum_to_timestamp: Story = createCaseStory("125-type-change-enum-to-timestamp");
export const Case_126_type_change_enum_to_bytea: Story = createCaseStory("126-type-change-enum-to-bytea");
export const Case_127_type_change_enum_to_jsonb: Story = createCaseStory("127-type-change-enum-to-jsonb");
