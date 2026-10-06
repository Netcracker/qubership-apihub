import { stringify as stringifyYaml } from "yaml";
import type { ValueRangeDiffProgrammaticSampleCase } from "./value-range-diff-samples";
import {
  listValueRangeDiffCases,
  resolveValueRangeDiffSchemas,
} from "./value-range-diff-samples";
import type { ValueRangeDiffSampleListOptions, ValueRangeDiffSampleResolveOptions } from "./value-range-diff-samples.types";

/**
 * Converts an OAS 3.0 / Draft-04 style value-range schema
 * (boolean exclusiveMinimum / exclusiveMaximum paired with minimum / maximum)
 * into OAS 3.1 / Draft 2020-12 numeric exclusive bound form.
 *
 * Example:
 * `{ type: "integer", minimum: 1, maximum: 10, exclusiveMaximum: true }`
 * → `{ type: "number", minimum: 1, exclusiveMaximum: 10 }`
 */
export const convertValueRangeSchemaToOas31 = (
  schema: Record<string, unknown>,
): Record<string, unknown> => {
  const minimum = schema.minimum;
  const exclusiveMinimum = schema.exclusiveMinimum;
  const maximum = schema.maximum;
  const exclusiveMaximum = schema.exclusiveMaximum;

  const result: Record<string, unknown> = { ...schema, type: "number" };
  delete result.minimum;
  delete result.exclusiveMinimum;
  delete result.maximum;
  delete result.exclusiveMaximum;

  if (typeof exclusiveMinimum === "number") {
    result.exclusiveMinimum = exclusiveMinimum;
  } else if (minimum !== undefined) {
    if (exclusiveMinimum === true) {
      result.exclusiveMinimum = minimum;
    } else {
      result.minimum = minimum;
    }
  }

  if (typeof exclusiveMaximum === "number") {
    result.exclusiveMaximum = exclusiveMaximum;
  } else if (maximum !== undefined) {
    if (exclusiveMaximum === true) {
      result.exclusiveMaximum = maximum;
    } else {
      result.maximum = maximum;
    }
  }

  return result;
};

export const resolveValueRangeDiffSchemasOas31 = (
  caseId: string,
  options: ValueRangeDiffSampleResolveOptions = {},
): { before: Record<string, unknown>; after: Record<string, unknown> } => {
  const { before, after } = resolveValueRangeDiffSchemas(caseId, options);
  return {
    before: convertValueRangeSchemaToOas31(before),
    after: convertValueRangeSchemaToOas31(after),
  };
};

export const resolveValueRangeDiffYamlPairOas31 = (
  caseId: string,
  options: ValueRangeDiffSampleResolveOptions = {},
): { beforeYaml: string; afterYaml: string } => {
  const { before, after } = resolveValueRangeDiffSchemasOas31(caseId, options);
  return {
    beforeYaml: `${stringifyYaml(before, { lineWidth: 0 })}\n`,
    afterYaml: `${stringifyYaml(after, { lineWidth: 0 })}\n`,
  };
};

export const buildValueRangeDiffOas31ProgrammaticSampleCases = (
  options: ValueRangeDiffSampleListOptions = {},
): ValueRangeDiffProgrammaticSampleCase[] =>
  listValueRangeDiffCases(options).map((sampleCase) => ({
    caseId: sampleCase.caseId,
    summary: sampleCase.summary,
    ...resolveValueRangeDiffYamlPairOas31(sampleCase.caseId, options),
  }));
