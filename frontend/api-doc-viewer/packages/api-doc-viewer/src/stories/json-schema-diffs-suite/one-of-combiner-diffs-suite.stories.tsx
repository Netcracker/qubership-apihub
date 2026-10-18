/**
 * Programmatic combiner (oneOf) diff stories.
 * See src/stories/json-schema-diffs-suite/combiner-diff-case-definitions.ts and packages/samples/json-schema-diffs/{oneOf,anyOf,allOf}/README.md.
 * Regenerate: node --experimental-strip-types bin/generate-combiner-diffs-suite-stories.mjs
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  JsonSchemaDiffSamplesStoryWithDisabledSubstitutionTitle,
  createJsonSchemaDiffCaseStoryFactoryWithChangedVariant,
  jsonSchemaDiffSampleReadonlyArgTypes,
} from "./json-schema-diffs-utils";
import { createSampleById } from "../utils/sample-cases";
import { buildCombinerDiffProgrammaticSampleCases } from "./combiner-diff-samples";

const sampleCases = buildCombinerDiffProgrammaticSampleCases("oneOf");
const sampleById = createSampleById(sampleCases);

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSON Schema Diffs Suite/Combiners/One Of Combiner Diffs Suite",
  component: JsonSchemaDiffSamplesStoryWithDisabledSubstitutionTitle,
  argTypes: jsonSchemaDiffSampleReadonlyArgTypes,
} satisfies Meta<typeof JsonSchemaDiffSamplesStoryWithDisabledSubstitutionTitle>;

export default meta;

type Story = StoryObj<typeof meta>;

const createCaseStory = createJsonSchemaDiffCaseStoryFactoryWithChangedVariant(
  JsonSchemaDiffSamplesStoryWithDisabledSubstitutionTitle,
  sampleById,
);

export const Case_001_string_add_option_number: Story = createCaseStory("001-string-add-option-number");
export const Case_002_string_remove_option_number: Story = createCaseStory("002-string-remove-option-number");
export const Case_003_string_add_option_integer: Story = createCaseStory("003-string-add-option-integer");
export const Case_004_string_remove_option_integer: Story = createCaseStory("004-string-remove-option-integer");
export const Case_005_string_add_option_boolean: Story = createCaseStory("005-string-add-option-boolean");
export const Case_006_string_remove_option_boolean: Story = createCaseStory("006-string-remove-option-boolean");
export const Case_007_string_add_option_array: Story = createCaseStory("007-string-add-option-array");
export const Case_008_string_remove_option_array: Story = createCaseStory("008-string-remove-option-array");
export const Case_009_string_add_option_object: Story = createCaseStory("009-string-add-option-object");
export const Case_010_string_remove_option_object: Story = createCaseStory("010-string-remove-option-object");
export const Case_011_number_add_option_string: Story = createCaseStory("011-number-add-option-string");
export const Case_012_number_remove_option_string: Story = createCaseStory("012-number-remove-option-string");
export const Case_013_number_add_option_integer: Story = createCaseStory("013-number-add-option-integer");
export const Case_014_number_remove_option_integer: Story = createCaseStory("014-number-remove-option-integer");
export const Case_015_number_add_option_boolean: Story = createCaseStory("015-number-add-option-boolean");
export const Case_016_number_remove_option_boolean: Story = createCaseStory("016-number-remove-option-boolean");
export const Case_017_number_add_option_array: Story = createCaseStory("017-number-add-option-array");
export const Case_018_number_remove_option_array: Story = createCaseStory("018-number-remove-option-array");
export const Case_019_number_add_option_object: Story = createCaseStory("019-number-add-option-object");
export const Case_020_number_remove_option_object: Story = createCaseStory("020-number-remove-option-object");
export const Case_021_integer_add_option_string: Story = createCaseStory("021-integer-add-option-string");
export const Case_022_integer_remove_option_string: Story = createCaseStory("022-integer-remove-option-string");
export const Case_023_integer_add_option_number: Story = createCaseStory("023-integer-add-option-number");
export const Case_024_integer_remove_option_number: Story = createCaseStory("024-integer-remove-option-number");
export const Case_025_integer_add_option_boolean: Story = createCaseStory("025-integer-add-option-boolean");
export const Case_026_integer_remove_option_boolean: Story = createCaseStory("026-integer-remove-option-boolean");
export const Case_027_integer_add_option_array: Story = createCaseStory("027-integer-add-option-array");
export const Case_028_integer_remove_option_array: Story = createCaseStory("028-integer-remove-option-array");
export const Case_029_integer_add_option_object: Story = createCaseStory("029-integer-add-option-object");
export const Case_030_integer_remove_option_object: Story = createCaseStory("030-integer-remove-option-object");
export const Case_031_boolean_add_option_string: Story = createCaseStory("031-boolean-add-option-string");
export const Case_032_boolean_remove_option_string: Story = createCaseStory("032-boolean-remove-option-string");
export const Case_033_boolean_add_option_number: Story = createCaseStory("033-boolean-add-option-number");
export const Case_034_boolean_remove_option_number: Story = createCaseStory("034-boolean-remove-option-number");
export const Case_035_boolean_add_option_integer: Story = createCaseStory("035-boolean-add-option-integer");
export const Case_036_boolean_remove_option_integer: Story = createCaseStory("036-boolean-remove-option-integer");
export const Case_037_boolean_add_option_array: Story = createCaseStory("037-boolean-add-option-array");
export const Case_038_boolean_remove_option_array: Story = createCaseStory("038-boolean-remove-option-array");
export const Case_039_boolean_add_option_object: Story = createCaseStory("039-boolean-add-option-object");
export const Case_040_boolean_remove_option_object: Story = createCaseStory("040-boolean-remove-option-object");
export const Case_041_array_add_option_string: Story = createCaseStory("041-array-add-option-string");
export const Case_042_array_remove_option_string: Story = createCaseStory("042-array-remove-option-string");
export const Case_043_array_add_option_number: Story = createCaseStory("043-array-add-option-number");
export const Case_044_array_remove_option_number: Story = createCaseStory("044-array-remove-option-number");
export const Case_045_array_add_option_integer: Story = createCaseStory("045-array-add-option-integer");
export const Case_046_array_remove_option_integer: Story = createCaseStory("046-array-remove-option-integer");
export const Case_047_array_add_option_boolean: Story = createCaseStory("047-array-add-option-boolean");
export const Case_048_array_remove_option_boolean: Story = createCaseStory("048-array-remove-option-boolean");
export const Case_049_array_add_option_object: Story = createCaseStory("049-array-add-option-object");
export const Case_050_array_remove_option_object: Story = createCaseStory("050-array-remove-option-object");
export const Case_051_object_add_option_string: Story = createCaseStory("051-object-add-option-string");
export const Case_052_object_remove_option_string: Story = createCaseStory("052-object-remove-option-string");
export const Case_053_object_add_option_number: Story = createCaseStory("053-object-add-option-number");
export const Case_054_object_remove_option_number: Story = createCaseStory("054-object-remove-option-number");
export const Case_055_object_add_option_integer: Story = createCaseStory("055-object-add-option-integer");
export const Case_056_object_remove_option_integer: Story = createCaseStory("056-object-remove-option-integer");
export const Case_057_object_add_option_boolean: Story = createCaseStory("057-object-add-option-boolean");
export const Case_058_object_remove_option_boolean: Story = createCaseStory("058-object-remove-option-boolean");
export const Case_059_object_add_option_array: Story = createCaseStory("059-object-add-option-array");
export const Case_060_object_remove_option_array: Story = createCaseStory("060-object-remove-option-array");
export const Case_061_all_types_string_title_added: Story = createCaseStory("061-all-types-string-title-added");
export const Case_062_all_types_string_title_removed: Story = createCaseStory("062-all-types-string-title-removed");
export const Case_063_all_types_string_title_replaced: Story = createCaseStory("063-all-types-string-title-replaced");
export const Case_064_all_types_string_format_added: Story = createCaseStory("064-all-types-string-format-added");
export const Case_065_all_types_string_format_removed: Story = createCaseStory("065-all-types-string-format-removed");
export const Case_066_all_types_string_format_replaced: Story = createCaseStory("066-all-types-string-format-replaced");
export const Case_067_all_types_string_to_number: Story = createCaseStory("067-all-types-string-to-number");
export const Case_068_all_types_string_to_integer: Story = createCaseStory("068-all-types-string-to-integer");
export const Case_069_all_types_string_to_boolean: Story = createCaseStory("069-all-types-string-to-boolean");
export const Case_070_all_types_string_to_array: Story = createCaseStory("070-all-types-string-to-array");
export const Case_071_all_types_string_to_object: Story = createCaseStory("071-all-types-string-to-object");
export const Case_072_all_types_number_title_added: Story = createCaseStory("072-all-types-number-title-added");
export const Case_073_all_types_number_title_removed: Story = createCaseStory("073-all-types-number-title-removed");
export const Case_074_all_types_number_title_replaced: Story = createCaseStory("074-all-types-number-title-replaced");
export const Case_075_all_types_number_format_added: Story = createCaseStory("075-all-types-number-format-added");
export const Case_076_all_types_number_format_removed: Story = createCaseStory("076-all-types-number-format-removed");
export const Case_077_all_types_number_format_replaced: Story = createCaseStory("077-all-types-number-format-replaced");
export const Case_078_all_types_number_to_string: Story = createCaseStory("078-all-types-number-to-string");
export const Case_079_all_types_number_to_integer: Story = createCaseStory("079-all-types-number-to-integer");
export const Case_080_all_types_number_to_boolean: Story = createCaseStory("080-all-types-number-to-boolean");
export const Case_081_all_types_number_to_array: Story = createCaseStory("081-all-types-number-to-array");
export const Case_082_all_types_number_to_object: Story = createCaseStory("082-all-types-number-to-object");
export const Case_083_all_types_integer_title_added: Story = createCaseStory("083-all-types-integer-title-added");
export const Case_084_all_types_integer_title_removed: Story = createCaseStory("084-all-types-integer-title-removed");
export const Case_085_all_types_integer_title_replaced: Story = createCaseStory("085-all-types-integer-title-replaced");
export const Case_086_all_types_integer_format_added: Story = createCaseStory("086-all-types-integer-format-added");
export const Case_087_all_types_integer_format_removed: Story = createCaseStory("087-all-types-integer-format-removed");
export const Case_088_all_types_integer_format_replaced: Story = createCaseStory("088-all-types-integer-format-replaced");
export const Case_089_all_types_integer_to_string: Story = createCaseStory("089-all-types-integer-to-string");
export const Case_090_all_types_integer_to_number: Story = createCaseStory("090-all-types-integer-to-number");
export const Case_091_all_types_integer_to_boolean: Story = createCaseStory("091-all-types-integer-to-boolean");
export const Case_092_all_types_integer_to_array: Story = createCaseStory("092-all-types-integer-to-array");
export const Case_093_all_types_integer_to_object: Story = createCaseStory("093-all-types-integer-to-object");
export const Case_094_all_types_boolean_title_added: Story = createCaseStory("094-all-types-boolean-title-added");
export const Case_095_all_types_boolean_title_removed: Story = createCaseStory("095-all-types-boolean-title-removed");
export const Case_096_all_types_boolean_title_replaced: Story = createCaseStory("096-all-types-boolean-title-replaced");
export const Case_097_all_types_boolean_format_added: Story = createCaseStory("097-all-types-boolean-format-added");
export const Case_098_all_types_boolean_format_removed: Story = createCaseStory("098-all-types-boolean-format-removed");
export const Case_099_all_types_boolean_format_replaced: Story = createCaseStory("099-all-types-boolean-format-replaced");
export const Case_100_all_types_boolean_to_string: Story = createCaseStory("100-all-types-boolean-to-string");
export const Case_101_all_types_boolean_to_number: Story = createCaseStory("101-all-types-boolean-to-number");
export const Case_102_all_types_boolean_to_integer: Story = createCaseStory("102-all-types-boolean-to-integer");
export const Case_103_all_types_boolean_to_array: Story = createCaseStory("103-all-types-boolean-to-array");
export const Case_104_all_types_boolean_to_object: Story = createCaseStory("104-all-types-boolean-to-object");
export const Case_105_all_types_array_title_added: Story = createCaseStory("105-all-types-array-title-added");
export const Case_106_all_types_array_title_removed: Story = createCaseStory("106-all-types-array-title-removed");
export const Case_107_all_types_array_title_replaced: Story = createCaseStory("107-all-types-array-title-replaced");
export const Case_108_all_types_array_format_added: Story = createCaseStory("108-all-types-array-format-added");
export const Case_109_all_types_array_format_removed: Story = createCaseStory("109-all-types-array-format-removed");
export const Case_110_all_types_array_format_replaced: Story = createCaseStory("110-all-types-array-format-replaced");
export const Case_111_all_types_array_to_string: Story = createCaseStory("111-all-types-array-to-string");
export const Case_112_all_types_array_to_number: Story = createCaseStory("112-all-types-array-to-number");
export const Case_113_all_types_array_to_integer: Story = createCaseStory("113-all-types-array-to-integer");
export const Case_114_all_types_array_to_boolean: Story = createCaseStory("114-all-types-array-to-boolean");
export const Case_115_all_types_array_to_object: Story = createCaseStory("115-all-types-array-to-object");
export const Case_116_all_types_object_title_added: Story = createCaseStory("116-all-types-object-title-added");
export const Case_117_all_types_object_title_removed: Story = createCaseStory("117-all-types-object-title-removed");
export const Case_118_all_types_object_title_replaced: Story = createCaseStory("118-all-types-object-title-replaced");
export const Case_119_all_types_object_format_added: Story = createCaseStory("119-all-types-object-format-added");
export const Case_120_all_types_object_format_removed: Story = createCaseStory("120-all-types-object-format-removed");
export const Case_121_all_types_object_format_replaced: Story = createCaseStory("121-all-types-object-format-replaced");
export const Case_122_all_types_object_to_string: Story = createCaseStory("122-all-types-object-to-string");
export const Case_123_all_types_object_to_number: Story = createCaseStory("123-all-types-object-to-number");
export const Case_124_all_types_object_to_integer: Story = createCaseStory("124-all-types-object-to-integer");
export const Case_125_all_types_object_to_boolean: Story = createCaseStory("125-all-types-object-to-boolean");
export const Case_126_all_types_object_to_array: Story = createCaseStory("126-all-types-object-to-array");
export const Case_127_add_option_number_wrapped_in_one_of: Story = createCaseStory("127-add-option-number-wrapped-in-one-of");
export const Case_128_remove_option_number_wrapped_in_one_of: Story = createCaseStory("128-remove-option-number-wrapped-in-one-of");
export const Case_129_add_option_number_wrapped_in_any_of: Story = createCaseStory("129-add-option-number-wrapped-in-any-of");
export const Case_130_remove_option_number_wrapped_in_any_of: Story = createCaseStory("130-remove-option-number-wrapped-in-any-of");
export const Case_131_add_option_number_wrapped_in_all_of: Story = createCaseStory("131-add-option-number-wrapped-in-all-of");
export const Case_132_remove_option_number_wrapped_in_all_of: Story = createCaseStory("132-remove-option-number-wrapped-in-all-of");
export const Case_133_nested_one_of_string_title_added: Story = createCaseStory("133-nested-one-of-string-title-added");
export const Case_134_nested_one_of_string_title_removed: Story = createCaseStory("134-nested-one-of-string-title-removed");
export const Case_135_nested_one_of_string_title_replaced: Story = createCaseStory("135-nested-one-of-string-title-replaced");
export const Case_136_nested_one_of_string_format_added: Story = createCaseStory("136-nested-one-of-string-format-added");
export const Case_137_nested_one_of_string_format_removed: Story = createCaseStory("137-nested-one-of-string-format-removed");
export const Case_138_nested_one_of_string_type_changed: Story = createCaseStory("138-nested-one-of-string-type-changed");
export const Case_139_nested_any_of_string_title_added: Story = createCaseStory("139-nested-any-of-string-title-added");
export const Case_140_nested_any_of_string_title_removed: Story = createCaseStory("140-nested-any-of-string-title-removed");
export const Case_141_nested_any_of_string_title_replaced: Story = createCaseStory("141-nested-any-of-string-title-replaced");
export const Case_142_nested_any_of_string_format_added: Story = createCaseStory("142-nested-any-of-string-format-added");
export const Case_143_nested_any_of_string_format_removed: Story = createCaseStory("143-nested-any-of-string-format-removed");
export const Case_144_nested_any_of_string_type_changed: Story = createCaseStory("144-nested-any-of-string-type-changed");
export const Case_145_nested_all_of_string_title_added: Story = createCaseStory("145-nested-all-of-string-title-added");
export const Case_146_nested_all_of_string_title_removed: Story = createCaseStory("146-nested-all-of-string-title-removed");
export const Case_147_nested_all_of_string_title_replaced: Story = createCaseStory("147-nested-all-of-string-title-replaced");
export const Case_148_nested_all_of_string_format_added: Story = createCaseStory("148-nested-all-of-string-format-added");
export const Case_149_nested_all_of_string_format_removed: Story = createCaseStory("149-nested-all-of-string-format-removed");
export const Case_150_nested_all_of_string_type_changed: Story = createCaseStory("150-nested-all-of-string-type-changed");
export const Case_151_nested_one_of_nested_one_of_string_title_added: Story = createCaseStory("151-nested-one-of-nested-one-of-string-title-added");
export const Case_152_nested_one_of_nested_one_of_string_title_removed: Story = createCaseStory("152-nested-one-of-nested-one-of-string-title-removed");
export const Case_153_nested_one_of_nested_one_of_string_title_replaced: Story = createCaseStory("153-nested-one-of-nested-one-of-string-title-replaced");
export const Case_154_nested_one_of_nested_any_of_string_title_added: Story = createCaseStory("154-nested-one-of-nested-any-of-string-title-added");
export const Case_155_nested_one_of_nested_any_of_string_title_removed: Story = createCaseStory("155-nested-one-of-nested-any-of-string-title-removed");
export const Case_156_nested_one_of_nested_any_of_string_title_replaced: Story = createCaseStory("156-nested-one-of-nested-any-of-string-title-replaced");
export const Case_157_nested_one_of_nested_all_of_string_title_added: Story = createCaseStory("157-nested-one-of-nested-all-of-string-title-added");
export const Case_158_nested_one_of_nested_all_of_string_title_removed: Story = createCaseStory("158-nested-one-of-nested-all-of-string-title-removed");
export const Case_159_nested_one_of_nested_all_of_string_title_replaced: Story = createCaseStory("159-nested-one-of-nested-all-of-string-title-replaced");
export const Case_160_nested_any_of_nested_one_of_string_title_added: Story = createCaseStory("160-nested-any-of-nested-one-of-string-title-added");
export const Case_161_nested_any_of_nested_one_of_string_title_removed: Story = createCaseStory("161-nested-any-of-nested-one-of-string-title-removed");
export const Case_162_nested_any_of_nested_one_of_string_title_replaced: Story = createCaseStory("162-nested-any-of-nested-one-of-string-title-replaced");
export const Case_163_nested_any_of_nested_any_of_string_title_added: Story = createCaseStory("163-nested-any-of-nested-any-of-string-title-added");
export const Case_164_nested_any_of_nested_any_of_string_title_removed: Story = createCaseStory("164-nested-any-of-nested-any-of-string-title-removed");
export const Case_165_nested_any_of_nested_any_of_string_title_replaced: Story = createCaseStory("165-nested-any-of-nested-any-of-string-title-replaced");
export const Case_166_nested_any_of_nested_all_of_string_title_added: Story = createCaseStory("166-nested-any-of-nested-all-of-string-title-added");
export const Case_167_nested_any_of_nested_all_of_string_title_removed: Story = createCaseStory("167-nested-any-of-nested-all-of-string-title-removed");
export const Case_168_nested_any_of_nested_all_of_string_title_replaced: Story = createCaseStory("168-nested-any-of-nested-all-of-string-title-replaced");
export const Case_169_nested_all_of_nested_one_of_string_title_added: Story = createCaseStory("169-nested-all-of-nested-one-of-string-title-added");
export const Case_170_nested_all_of_nested_one_of_string_title_removed: Story = createCaseStory("170-nested-all-of-nested-one-of-string-title-removed");
export const Case_171_nested_all_of_nested_one_of_string_title_replaced: Story = createCaseStory("171-nested-all-of-nested-one-of-string-title-replaced");
export const Case_172_nested_all_of_nested_any_of_string_title_added: Story = createCaseStory("172-nested-all-of-nested-any-of-string-title-added");
export const Case_173_nested_all_of_nested_any_of_string_title_removed: Story = createCaseStory("173-nested-all-of-nested-any-of-string-title-removed");
export const Case_174_nested_all_of_nested_any_of_string_title_replaced: Story = createCaseStory("174-nested-all-of-nested-any-of-string-title-replaced");
export const Case_175_nested_all_of_nested_all_of_string_title_added: Story = createCaseStory("175-nested-all-of-nested-all-of-string-title-added");
export const Case_176_nested_all_of_nested_all_of_string_title_removed: Story = createCaseStory("176-nested-all-of-nested-all-of-string-title-removed");
export const Case_177_nested_all_of_nested_all_of_string_title_replaced: Story = createCaseStory("177-nested-all-of-nested-all-of-string-title-replaced");
