import { stringify as stringifyYaml } from "yaml";
import { convertValueRangeSchemaToOas31 } from "../json-schema-diffs-suite/value-range-diff-oas-31-samples";
import {
  getValueRangePlainCaseDefinitions,
  listValueRangePlainCases,
  resolveValueRangePlainSchema,
  toValueRangePlainCaseExportName,
} from "./value-range-plain-case-definitions";
import type {
  ValueRangePlainCase,
  ValueRangePlainSampleListOptions,
  ValueRangePlainSampleResolveOptions,
} from "./value-range-plain-case-definitions";

export type {
  ValueRangePlainCase,
  ValueRangePlainCaseDefinition,
  ValueRangePlainSampleListOptions,
  ValueRangePlainSampleResolveOptions,
} from "./value-range-plain-case-definitions";

export {
  getValueRangePlainCaseDefinitions,
  listValueRangePlainCases,
  resolveValueRangePlainSchema,
  toValueRangePlainCaseExportName,
} from "./value-range-plain-case-definitions";

export type ValueRangePlainProgrammaticSampleCase = {
  caseId: string;
  schema: Record<string, unknown>;
  summary: string;
};

export const buildValueRangePlainProgrammaticSampleCases = (
  options: ValueRangePlainSampleResolveOptions = {},
): ValueRangePlainProgrammaticSampleCase[] =>
  listValueRangePlainCases(options).map((sampleCase) => ({
    caseId: sampleCase.caseId,
    summary: sampleCase.summary,
    schema: resolveValueRangePlainSchema(sampleCase.caseId, options),
  }));

export const resolveValueRangePlainSchemaOas31 = (
  caseId: string,
  options: ValueRangePlainSampleResolveOptions = {},
): Record<string, unknown> =>
  convertValueRangeSchemaToOas31(resolveValueRangePlainSchema(caseId, options));

export const buildValueRangePlainOas31ProgrammaticSampleCases = (
  options: ValueRangePlainSampleResolveOptions = {},
): ValueRangePlainProgrammaticSampleCase[] =>
  listValueRangePlainCases({ ...options, includeOas31Only: true }).map((sampleCase) => ({
    caseId: sampleCase.caseId,
    summary: sampleCase.summary,
    schema: resolveValueRangePlainSchemaOas31(sampleCase.caseId, options),
  }));

export const resolveValueRangePlainYaml = (
  caseId: string,
  options: ValueRangePlainSampleResolveOptions = {},
): string => `${stringifyYaml(resolveValueRangePlainSchema(caseId, options), { lineWidth: 0 })}\n`;
