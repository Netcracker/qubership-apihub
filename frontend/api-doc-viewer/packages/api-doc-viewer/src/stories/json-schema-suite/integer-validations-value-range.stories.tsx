/**
 * Programmatic value-range plain stories (see value-range-plain-case-definitions.ts).
 * Regenerate: node bin/generate-json-schema-validation-suite-stories.mjs
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { JsonSchemaViewer } from "@apihub/components/JsonSchemaViewer/JsonSchemaViewer";
import {
  JsonSchemaSampleStory,
  jsonSchemaSamplesStoryMetaBase,
  toSampleYaml,
  type JsonSchemaSamplesStoryObj,
} from "./json-schema-samples-common";
import {
  buildValueRangePlainProgrammaticSampleCases,
  type ValueRangePlainProgrammaticSampleCase,
} from "./value-range-plain-samples";

const sampleCases = buildValueRangePlainProgrammaticSampleCases({ includeOas31Only: false, type: "integer" });
const sampleById = sampleCases.reduce<Record<string, ValueRangePlainProgrammaticSampleCase>>(
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
  id: "json-schema-suite-integer-validations-value-range",
  title: "JSON Schema Suite/Integer Validations Value Range",
} satisfies Meta<typeof JsonSchemaSampleStory>;

export default meta;

type Story = JsonSchemaSamplesStoryObj;

export const Case_001_value_range_min_0_inclusive: Story = createCaseStory("001-value-range-min-0-inclusive");
export const Case_002_value_range_min_1_inclusive: Story = createCaseStory("002-value-range-min-1-inclusive");
export const Case_003_value_range_min_1_exclusive_oas30: Story = createCaseStory("003-value-range-min-1-exclusive-oas30");
export const Case_004_value_range_max_0_inclusive: Story = createCaseStory("004-value-range-max-0-inclusive");
export const Case_005_value_range_max_10_inclusive: Story = createCaseStory("005-value-range-max-10-inclusive");
export const Case_006_value_range_max_10_exclusive_oas30: Story = createCaseStory("006-value-range-max-10-exclusive-oas30");
export const Case_007_value_range_min_0_max_10_both_inclusive: Story = createCaseStory("007-value-range-min-0-max-10-both-inclusive");
export const Case_008_value_range_min_1_max_10_both_inclusive: Story = createCaseStory("008-value-range-min-1-max-10-both-inclusive");
export const Case_009_value_range_min_0_max_10_max_exclusive_oas30: Story = createCaseStory("009-value-range-min-0-max-10-max-exclusive-oas30");
export const Case_010_value_range_min_1_max_10_max_exclusive_oas30: Story = createCaseStory("010-value-range-min-1-max-10-max-exclusive-oas30");
export const Case_011_value_range_min_1_exclusive_max_10_inclusive_oas30: Story = createCaseStory("011-value-range-min-1-exclusive-max-10-inclusive-oas30");
export const Case_012_value_range_min_1_inclusive_max_10_exclusive_oas30: Story = createCaseStory("012-value-range-min-1-inclusive-max-10-exclusive-oas30");
export const Case_013_value_range_min_1_exclusive_max_10_exclusive_oas30: Story = createCaseStory("013-value-range-min-1-exclusive-max-10-exclusive-oas30");
