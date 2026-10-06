/**
 * Programmatic value-range diff stories (see src/stories/json-schema-diffs-suite/value-range-diff-case-definitions.ts).
 * Regenerate: node --experimental-strip-types bin/generate-value-range-diff-stories.mjs
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  JsonSchemaDiffSamplesStoryOas31,
  createJsonSchemaDiffCaseStoryFactoryWithChangedVariant,
  jsonSchemaDiffSampleReadonlyArgTypes,
} from "./json-schema-diffs-utils";
import { createSampleById } from "../utils/sample-cases";
import { buildValueRangeDiffOas31ProgrammaticSampleCases } from "./value-range-diff-oas-31-samples";

const sampleCases = buildValueRangeDiffOas31ProgrammaticSampleCases({ includeOas31Only: true });
const sampleById = createSampleById(sampleCases);

// eslint-disable-next-line storybook/story-exports
const meta = {
  title: "JSON Schema Diffs Suite/Number Validation/Number Validation Value Range OAS 3.1",
  component: JsonSchemaDiffSamplesStoryOas31,
  argTypes: jsonSchemaDiffSampleReadonlyArgTypes,
} satisfies Meta<typeof JsonSchemaDiffSamplesStoryOas31>;

export default meta;

type Story = StoryObj<typeof meta>;

const createCaseStory = createJsonSchemaDiffCaseStoryFactoryWithChangedVariant(
  JsonSchemaDiffSamplesStoryOas31,
  sampleById,
);

export const Case_001_minimum_added: Story = createCaseStory("001-minimum-added");
export const Case_002_minimum_added_with_exclusive_minimum_true: Story = createCaseStory("002-minimum-added-with-exclusive-minimum-true");
export const Case_003_minimum_removed: Story = createCaseStory("003-minimum-removed");
export const Case_004_minimum_with_exclusive_minimum_true_removed: Story = createCaseStory("004-minimum-with-exclusive-minimum-true-removed");
export const Case_005_exclusive_minimum_false_to_true: Story = createCaseStory("005-exclusive-minimum-false-to-true");
export const Case_006_exclusive_minimum_true_to_false: Story = createCaseStory("006-exclusive-minimum-true-to-false");
export const Case_007_maximum_added: Story = createCaseStory("007-maximum-added");
export const Case_008_maximum_added_with_exclusive_maximum_true: Story = createCaseStory("008-maximum-added-with-exclusive-maximum-true");
export const Case_009_maximum_removed: Story = createCaseStory("009-maximum-removed");
export const Case_010_maximum_with_exclusive_maximum_true_removed: Story = createCaseStory("010-maximum-with-exclusive-maximum-true-removed");
export const Case_011_exclusive_maximum_false_to_true: Story = createCaseStory("011-exclusive-maximum-false-to-true");
export const Case_012_exclusive_maximum_true_to_false: Story = createCaseStory("012-exclusive-maximum-true-to-false");
export const Case_013_minimum_maximum_added: Story = createCaseStory("013-minimum-maximum-added");
export const Case_014_minimum_inclusive_maximum_exclusive_added: Story = createCaseStory("014-minimum-inclusive-maximum-exclusive-added");
export const Case_015_minimum_exclusive_maximum_inclusive_added: Story = createCaseStory("015-minimum-exclusive-maximum-inclusive-added");
export const Case_016_minimum_maximum_both_exclusive_added: Story = createCaseStory("016-minimum-maximum-both-exclusive-added");
export const Case_017_minimum_maximum_removed: Story = createCaseStory("017-minimum-maximum-removed");
export const Case_018_minimum_inclusive_maximum_exclusive_removed: Story = createCaseStory("018-minimum-inclusive-maximum-exclusive-removed");
export const Case_019_minimum_exclusive_maximum_inclusive_removed: Story = createCaseStory("019-minimum-exclusive-maximum-inclusive-removed");
export const Case_020_minimum_maximum_both_exclusive_removed: Story = createCaseStory("020-minimum-maximum-both-exclusive-removed");
export const Case_021_min_ex_max_in_min_ex_to_inclusive: Story = createCaseStory("021-min-ex-max-in-min-ex-to-inclusive");
export const Case_022_min_ex_max_in_max_in_to_exclusive: Story = createCaseStory("022-min-ex-max-in-max-in-to-exclusive");
export const Case_023_min_in_max_ex_min_in_to_exclusive: Story = createCaseStory("023-min-in-max-ex-min-in-to-exclusive");
export const Case_024_min_in_max_ex_max_ex_to_inclusive: Story = createCaseStory("024-min-in-max-ex-max-ex-to-inclusive");
export const Case_025_min_in_max_in_min_in_to_exclusive: Story = createCaseStory("025-min-in-max-in-min-in-to-exclusive");
export const Case_026_min_in_max_in_max_in_to_exclusive: Story = createCaseStory("026-min-in-max-in-max-in-to-exclusive");
export const Case_027_min_in_max_in_both_to_exclusive: Story = createCaseStory("027-min-in-max-in-both-to-exclusive");
export const Case_028_min_ex_max_ex_min_ex_to_inclusive: Story = createCaseStory("028-min-ex-max-ex-min-ex-to-inclusive");
export const Case_029_min_ex_max_ex_max_ex_to_inclusive: Story = createCaseStory("029-min-ex-max-ex-max-ex-to-inclusive");
export const Case_030_min_ex_max_ex_both_to_inclusive: Story = createCaseStory("030-min-ex-max-ex-both-to-inclusive");
export const Case_031_unchanged_minimum_inclusive: Story = createCaseStory("031-unchanged-minimum-inclusive");
export const Case_032_unchanged_minimum_exclusive: Story = createCaseStory("032-unchanged-minimum-exclusive");
export const Case_033_unchanged_maximum_inclusive: Story = createCaseStory("033-unchanged-maximum-inclusive");
export const Case_034_unchanged_maximum_exclusive: Story = createCaseStory("034-unchanged-maximum-exclusive");
export const Case_035_unchanged_min_max_inclusive: Story = createCaseStory("035-unchanged-min-max-inclusive");
export const Case_036_unchanged_min_inclusive_max_exclusive: Story = createCaseStory("036-unchanged-min-inclusive-max-exclusive");
export const Case_037_unchanged_min_max_both_exclusive: Story = createCaseStory("037-unchanged-min-max-both-exclusive");
export const Case_038_min_in_add_max_in: Story = createCaseStory("038-min-in-add-max-in");
export const Case_039_min_in_add_max_ex: Story = createCaseStory("039-min-in-add-max-ex");
export const Case_040_min_ex_add_max_in: Story = createCaseStory("040-min-ex-add-max-in");
export const Case_041_min_ex_add_max_ex: Story = createCaseStory("041-min-ex-add-max-ex");
export const Case_042_max_in_add_min_in: Story = createCaseStory("042-max-in-add-min-in");
export const Case_043_max_in_add_min_ex: Story = createCaseStory("043-max-in-add-min-ex");
export const Case_044_max_ex_add_min_in: Story = createCaseStory("044-max-ex-add-min-in");
export const Case_045_max_ex_add_min_ex: Story = createCaseStory("045-max-ex-add-min-ex");
export const Case_046_min_in_max_in_remove_minimum: Story = createCaseStory("046-min-in-max-in-remove-minimum");
export const Case_047_min_in_max_in_remove_maximum: Story = createCaseStory("047-min-in-max-in-remove-maximum");
export const Case_048_min_ex_max_ex_remove_minimum: Story = createCaseStory("048-min-ex-max-ex-remove-minimum");
export const Case_049_min_ex_max_ex_remove_maximum: Story = createCaseStory("049-min-ex-max-ex-remove-maximum");
export const Case_050_min_in_max_ex_remove_minimum: Story = createCaseStory("050-min-in-max-ex-remove-minimum");
export const Case_051_min_in_max_ex_remove_maximum: Story = createCaseStory("051-min-in-max-ex-remove-maximum");
export const Case_052_min_ex_max_in_remove_minimum: Story = createCaseStory("052-min-ex-max-in-remove-minimum");
export const Case_053_min_ex_max_in_remove_maximum: Story = createCaseStory("053-min-ex-max-in-remove-maximum");
export const Case_054_exclusive_minimum_numeric_added: Story = createCaseStory("054-exclusive-minimum-numeric-added");
export const Case_055_exclusive_minimum_numeric_removed: Story = createCaseStory("055-exclusive-minimum-numeric-removed");
export const Case_056_exclusive_maximum_numeric_added: Story = createCaseStory("056-exclusive-maximum-numeric-added");
export const Case_057_exclusive_maximum_numeric_removed: Story = createCaseStory("057-exclusive-maximum-numeric-removed");
