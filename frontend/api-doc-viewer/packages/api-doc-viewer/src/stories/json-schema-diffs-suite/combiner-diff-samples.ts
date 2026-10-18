import { stringify as stringifyYaml } from "yaml";
import type { CombinerKind } from "../shared/combiner-schema-builder.ts";
import {
  getCombinerDiffCaseDefinitions,
  listCombinerDiffCases,
} from "./combiner-diff-case-definitions";
import type { CombinerDiffCase, CombinerDiffCaseDefinition } from "./combiner-diff-case-definitions";

export type {
  CombinerDiffCase,
  CombinerDiffCaseDefinition,
} from "./combiner-diff-case-definitions";

export {
  getCombinerDiffCaseDefinitions,
  listCombinerDiffCases,
} from "./combiner-diff-case-definitions";

export const findCombinerDiffCase = (combinerKind: CombinerKind, caseId: string): CombinerDiffCase => {
  const sampleCase = listCombinerDiffCases(combinerKind).find((entry) => entry.caseId === caseId);
  if (!sampleCase) {
    throw new Error(`Combiner diff case not found: ${combinerKind}/${caseId}`);
  }
  return sampleCase;
};

export const resolveCombinerDiffSchemas = (
  combinerKind: CombinerKind,
  caseId: string,
): { before: Record<string, unknown>; after: Record<string, unknown> } => {
  const sampleCase = findCombinerDiffCase(combinerKind, caseId);
  return {
    before: structuredClone(sampleCase.before),
    after: structuredClone(sampleCase.after),
  };
};

export const resolveCombinerDiffYamlPair = (
  combinerKind: CombinerKind,
  caseId: string,
): { beforeYaml: string; afterYaml: string } => {
  const { before, after } = resolveCombinerDiffSchemas(combinerKind, caseId);
  return {
    beforeYaml: `${stringifyYaml(before, { lineWidth: 0 })}\n`,
    afterYaml: `${stringifyYaml(after, { lineWidth: 0 })}\n`,
  };
};

export type CombinerDiffProgrammaticSampleCase = {
  caseId: string;
  beforeYaml: string;
  afterYaml: string;
  summary: string;
};

export const buildCombinerDiffProgrammaticSampleCases = (
  combinerKind: CombinerKind,
): CombinerDiffProgrammaticSampleCase[] =>
  listCombinerDiffCases(combinerKind).map((sampleCase) => ({
    caseId: sampleCase.caseId,
    summary: sampleCase.summary,
    ...resolveCombinerDiffYamlPair(combinerKind, sampleCase.caseId),
  }));
