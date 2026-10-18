import { stringify as stringifyYaml } from "yaml";
import {
  getValueRangeDiffCaseDefinitions,
  listValueRangeDiffCases,
  toValueRangeCaseExportName,
} from "./value-range-diff-case-definitions";
import type {
  ValueRangeDiffCase,
  ValueRangeDiffCaseDefinition,
  ValueRangeDiffSampleListOptions,
  ValueRangeDiffSampleResolveOptions,
} from "./value-range-diff-samples.types";

export type {
  ValueRangeDiffCase,
  ValueRangeDiffCaseDefinition,
  ValueRangeDiffSampleListOptions,
  ValueRangeDiffSampleResolveOptions,
} from "./value-range-diff-samples.types";

export {
  getValueRangeDiffCaseDefinitions,
  listValueRangeDiffCases,
  toValueRangeCaseExportName,
} from "./value-range-diff-case-definitions";

const applyResolveOptions = (
  schema: Record<string, unknown>,
  options: ValueRangeDiffSampleResolveOptions,
): Record<string, unknown> => {
  const resolved = structuredClone(schema);
  if (options.type !== undefined) {
    resolved.type = options.type;
  }
  return resolved;
};

export const findValueRangeDiffCase = (
  caseId: string,
  options: ValueRangeDiffSampleListOptions = {},
): ValueRangeDiffCase => {
  const sampleCase = listValueRangeDiffCases(options).find((entry) => entry.caseId === caseId);
  if (!sampleCase) {
    throw new Error(`Value-range diff case not found: ${caseId}`);
  }
  return sampleCase;
};

export const resolveValueRangeDiffSchemas = (
  caseId: string,
  options: ValueRangeDiffSampleResolveOptions = {},
): { before: Record<string, unknown>; after: Record<string, unknown> } => {
  const sampleCase = findValueRangeDiffCase(caseId, options);
  return {
    before: applyResolveOptions(sampleCase.before, options),
    after: applyResolveOptions(sampleCase.after, options),
  };
};

export const resolveValueRangeDiffYamlPair = (
  caseId: string,
  options: ValueRangeDiffSampleResolveOptions = {},
): { beforeYaml: string; afterYaml: string } => {
  const { before, after } = resolveValueRangeDiffSchemas(caseId, options);
  return {
    beforeYaml: `${stringifyYaml(before, { lineWidth: 0 })}\n`,
    afterYaml: `${stringifyYaml(after, { lineWidth: 0 })}\n`,
  };
};

export type ValueRangeDiffProgrammaticSampleCase = {
  caseId: string;
  beforeYaml: string;
  afterYaml: string;
  summary: string;
};

export const buildValueRangeDiffProgrammaticSampleCases = (
  options: ValueRangeDiffSampleListOptions = {},
): ValueRangeDiffProgrammaticSampleCase[] =>
  listValueRangeDiffCases(options).map((sampleCase) => ({
    caseId: sampleCase.caseId,
    summary: sampleCase.summary,
    ...resolveValueRangeDiffYamlPair(sampleCase.caseId, options),
  }));
