/**
 * Programmatic combiner (oneOf) stories.
 * See src/stories/json-schema-suite/combiner-plain-case-definitions.ts and packages/samples/json-schema/{oneOf,anyOf,allOf}/README.md.
 * Regenerate: node --experimental-strip-types bin/generate-combiner-suite-stories.mjs
 */
import type { Meta } from '@storybook/react-vite'
import {
  jsonSchemaSamplesStoryMetaBase,
  type JsonSchemaSamplesStoryObj,
  JsonSchemaSampleStory,
  toSampleYaml,
} from './json-schema-samples-common'
import {
  buildCombinerPlainProgrammaticSampleCases,
  type CombinerPlainProgrammaticSampleCase,
} from './combiner-plain-samples'
import { JsonSchemaViewer } from '@apihub/components/JsonSchemaViewer/JsonSchemaViewer'

const sampleCases = buildCombinerPlainProgrammaticSampleCases("oneOf");
const sampleById = sampleCases.reduce<Record<string, CombinerPlainProgrammaticSampleCase>>(
  (accumulator, sampleCase) => {
    accumulator[sampleCase.caseId] = sampleCase;
    return accumulator;
  },
  {},
);

const createCaseStory = (caseId: string): JsonSchemaSamplesStoryObj => {
  const sampleCase = sampleById[caseId];
  if (!sampleCase) {
    throw new Error(`Sample case not found: ${caseId}`);
  }

  return {
    name: caseId,
    args: { caseId, sampleYaml: toSampleYaml(sampleCase.schema) },
    render: (args) => {
      const resolvedSample = sampleById[args.caseId];
      return (
        <JsonSchemaViewer schema={resolvedSample.schema} expandedDepth={5} />
      );
    },
  };
};

// eslint-disable-next-line storybook/story-exports
const meta = {
  ...jsonSchemaSamplesStoryMetaBase,
  id: "json-schema-suite-one-of-combiner-suite",
  title: "JSON Schema Suite/Combiners/One Of Combiner Suite",
} satisfies Meta<typeof JsonSchemaSampleStory>;

export default meta;

type Story = JsonSchemaSamplesStoryObj;

export const Case_001_string_schema: Story = createCaseStory("001-string-schema");
export const Case_002_number_schema: Story = createCaseStory("002-number-schema");
export const Case_003_integer_schema: Story = createCaseStory("003-integer-schema");
export const Case_004_boolean_schema: Story = createCaseStory("004-boolean-schema");
export const Case_005_array_schema: Story = createCaseStory("005-array-schema");
export const Case_006_object_schema: Story = createCaseStory("006-object-schema");
export const Case_007_all_types_schema: Story = createCaseStory("007-all-types-schema");
export const Case_008_string_MyString_NULL_schema: Story = createCaseStory("008-string-MyString-NULL-schema");
export const Case_009_string_NULL_ISODateTime_schema: Story = createCaseStory("009-string-NULL-ISODateTime-schema");
export const Case_010_string_MyString_ISODateTime_schema: Story = createCaseStory("010-string-MyString-ISODateTime-schema");
export const Case_011_number_MyNumber_NULL_schema: Story = createCaseStory("011-number-MyNumber-NULL-schema");
export const Case_012_number_NULL_ISODateTime_schema: Story = createCaseStory("012-number-NULL-ISODateTime-schema");
export const Case_013_number_MyNumber_ISODateTime_schema: Story = createCaseStory("013-number-MyNumber-ISODateTime-schema");
export const Case_014_integer_MyInteger_NULL_schema: Story = createCaseStory("014-integer-MyInteger-NULL-schema");
export const Case_015_integer_NULL_ISODateTime_schema: Story = createCaseStory("015-integer-NULL-ISODateTime-schema");
export const Case_016_integer_MyInteger_ISODateTime_schema: Story = createCaseStory("016-integer-MyInteger-ISODateTime-schema");
export const Case_017_boolean_MyBoolean_NULL_schema: Story = createCaseStory("017-boolean-MyBoolean-NULL-schema");
export const Case_018_boolean_NULL_ISODateTime_schema: Story = createCaseStory("018-boolean-NULL-ISODateTime-schema");
export const Case_019_boolean_MyBoolean_ISODateTime_schema: Story = createCaseStory("019-boolean-MyBoolean-ISODateTime-schema");
export const Case_020_array_MyArray_NULL_schema: Story = createCaseStory("020-array-MyArray-NULL-schema");
export const Case_021_array_NULL_ISODateTime_schema: Story = createCaseStory("021-array-NULL-ISODateTime-schema");
export const Case_022_array_MyArray_ISODateTime_schema: Story = createCaseStory("022-array-MyArray-ISODateTime-schema");
export const Case_023_object_MyObject_NULL_schema: Story = createCaseStory("023-object-MyObject-NULL-schema");
export const Case_024_object_NULL_ISODateTime_schema: Story = createCaseStory("024-object-NULL-ISODateTime-schema");
export const Case_025_object_MyObject_ISODateTime_schema: Story = createCaseStory("025-object-MyObject-ISODateTime-schema");
export const Case_026_string_schema_one_of: Story = createCaseStory("026-string-schema-one-of");
export const Case_027_number_schema_one_of: Story = createCaseStory("027-number-schema-one-of");
export const Case_028_integer_schema_one_of: Story = createCaseStory("028-integer-schema-one-of");
export const Case_029_boolean_schema_one_of: Story = createCaseStory("029-boolean-schema-one-of");
export const Case_030_array_schema_one_of: Story = createCaseStory("030-array-schema-one-of");
export const Case_031_object_schema_one_of: Story = createCaseStory("031-object-schema-one-of");
export const Case_032_string_schema_any_of: Story = createCaseStory("032-string-schema-any-of");
export const Case_033_number_schema_any_of: Story = createCaseStory("033-number-schema-any-of");
export const Case_034_integer_schema_any_of: Story = createCaseStory("034-integer-schema-any-of");
export const Case_035_boolean_schema_any_of: Story = createCaseStory("035-boolean-schema-any-of");
export const Case_036_array_schema_any_of: Story = createCaseStory("036-array-schema-any-of");
export const Case_037_object_schema_any_of: Story = createCaseStory("037-object-schema-any-of");
export const Case_038_string_schema_all_of: Story = createCaseStory("038-string-schema-all-of");
export const Case_039_number_schema_all_of: Story = createCaseStory("039-number-schema-all-of");
export const Case_040_integer_schema_all_of: Story = createCaseStory("040-integer-schema-all-of");
export const Case_041_boolean_schema_all_of: Story = createCaseStory("041-boolean-schema-all-of");
export const Case_042_array_schema_all_of: Story = createCaseStory("042-array-schema-all-of");
export const Case_043_object_schema_all_of: Story = createCaseStory("043-object-schema-all-of");
export const Case_044_string_schema_one_of_one_of: Story = createCaseStory("044-string-schema-one-of-one-of");
export const Case_045_number_schema_one_of_one_of: Story = createCaseStory("045-number-schema-one-of-one-of");
export const Case_046_integer_schema_one_of_one_of: Story = createCaseStory("046-integer-schema-one-of-one-of");
export const Case_047_boolean_schema_one_of_one_of: Story = createCaseStory("047-boolean-schema-one-of-one-of");
export const Case_048_array_schema_one_of_one_of: Story = createCaseStory("048-array-schema-one-of-one-of");
export const Case_049_object_schema_one_of_one_of: Story = createCaseStory("049-object-schema-one-of-one-of");
export const Case_050_string_schema_one_of_any_of: Story = createCaseStory("050-string-schema-one-of-any-of");
export const Case_051_number_schema_one_of_any_of: Story = createCaseStory("051-number-schema-one-of-any-of");
export const Case_052_integer_schema_one_of_any_of: Story = createCaseStory("052-integer-schema-one-of-any-of");
export const Case_053_boolean_schema_one_of_any_of: Story = createCaseStory("053-boolean-schema-one-of-any-of");
export const Case_054_array_schema_one_of_any_of: Story = createCaseStory("054-array-schema-one-of-any-of");
export const Case_055_object_schema_one_of_any_of: Story = createCaseStory("055-object-schema-one-of-any-of");
export const Case_056_string_schema_one_of_all_of: Story = createCaseStory("056-string-schema-one-of-all-of");
export const Case_057_number_schema_one_of_all_of: Story = createCaseStory("057-number-schema-one-of-all-of");
export const Case_058_integer_schema_one_of_all_of: Story = createCaseStory("058-integer-schema-one-of-all-of");
export const Case_059_boolean_schema_one_of_all_of: Story = createCaseStory("059-boolean-schema-one-of-all-of");
export const Case_060_array_schema_one_of_all_of: Story = createCaseStory("060-array-schema-one-of-all-of");
export const Case_061_object_schema_one_of_all_of: Story = createCaseStory("061-object-schema-one-of-all-of");
export const Case_062_string_schema_any_of_one_of: Story = createCaseStory("062-string-schema-any-of-one-of");
export const Case_063_number_schema_any_of_one_of: Story = createCaseStory("063-number-schema-any-of-one-of");
export const Case_064_integer_schema_any_of_one_of: Story = createCaseStory("064-integer-schema-any-of-one-of");
export const Case_065_boolean_schema_any_of_one_of: Story = createCaseStory("065-boolean-schema-any-of-one-of");
export const Case_066_array_schema_any_of_one_of: Story = createCaseStory("066-array-schema-any-of-one-of");
export const Case_067_object_schema_any_of_one_of: Story = createCaseStory("067-object-schema-any-of-one-of");
export const Case_068_string_schema_any_of_any_of: Story = createCaseStory("068-string-schema-any-of-any-of");
export const Case_069_number_schema_any_of_any_of: Story = createCaseStory("069-number-schema-any-of-any-of");
export const Case_070_integer_schema_any_of_any_of: Story = createCaseStory("070-integer-schema-any-of-any-of");
export const Case_071_boolean_schema_any_of_any_of: Story = createCaseStory("071-boolean-schema-any-of-any-of");
export const Case_072_array_schema_any_of_any_of: Story = createCaseStory("072-array-schema-any-of-any-of");
export const Case_073_object_schema_any_of_any_of: Story = createCaseStory("073-object-schema-any-of-any-of");
export const Case_074_string_schema_any_of_all_of: Story = createCaseStory("074-string-schema-any-of-all-of");
export const Case_075_number_schema_any_of_all_of: Story = createCaseStory("075-number-schema-any-of-all-of");
export const Case_076_integer_schema_any_of_all_of: Story = createCaseStory("076-integer-schema-any-of-all-of");
export const Case_077_boolean_schema_any_of_all_of: Story = createCaseStory("077-boolean-schema-any-of-all-of");
export const Case_078_array_schema_any_of_all_of: Story = createCaseStory("078-array-schema-any-of-all-of");
export const Case_079_object_schema_any_of_all_of: Story = createCaseStory("079-object-schema-any-of-all-of");
export const Case_080_string_schema_all_of_one_of: Story = createCaseStory("080-string-schema-all-of-one-of");
export const Case_081_number_schema_all_of_one_of: Story = createCaseStory("081-number-schema-all-of-one-of");
export const Case_082_integer_schema_all_of_one_of: Story = createCaseStory("082-integer-schema-all-of-one-of");
export const Case_083_boolean_schema_all_of_one_of: Story = createCaseStory("083-boolean-schema-all-of-one-of");
export const Case_084_array_schema_all_of_one_of: Story = createCaseStory("084-array-schema-all-of-one-of");
export const Case_085_object_schema_all_of_one_of: Story = createCaseStory("085-object-schema-all-of-one-of");
export const Case_086_string_schema_all_of_any_of: Story = createCaseStory("086-string-schema-all-of-any-of");
export const Case_087_number_schema_all_of_any_of: Story = createCaseStory("087-number-schema-all-of-any-of");
export const Case_088_integer_schema_all_of_any_of: Story = createCaseStory("088-integer-schema-all-of-any-of");
export const Case_089_boolean_schema_all_of_any_of: Story = createCaseStory("089-boolean-schema-all-of-any-of");
export const Case_090_array_schema_all_of_any_of: Story = createCaseStory("090-array-schema-all-of-any-of");
export const Case_091_object_schema_all_of_any_of: Story = createCaseStory("091-object-schema-all-of-any-of");
export const Case_092_string_schema_all_of_all_of: Story = createCaseStory("092-string-schema-all-of-all-of");
export const Case_093_number_schema_all_of_all_of: Story = createCaseStory("093-number-schema-all-of-all-of");
export const Case_094_integer_schema_all_of_all_of: Story = createCaseStory("094-integer-schema-all-of-all-of");
export const Case_095_boolean_schema_all_of_all_of: Story = createCaseStory("095-boolean-schema-all-of-all-of");
export const Case_096_array_schema_all_of_all_of: Story = createCaseStory("096-array-schema-all-of-all-of");
export const Case_097_object_schema_all_of_all_of: Story = createCaseStory("097-object-schema-all-of-all-of");
