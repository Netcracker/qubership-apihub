import type { CombinerKind } from '../shared/combiner-schema-builder'
import { listCombinerPlainCases, resolveCombinerPlainSchema } from './combiner-plain-case-definitions'

export type {
  CombinerPlainCase,
  CombinerPlainCaseDefinition,
} from './combiner-plain-case-definitions'

export {
  getCombinerPlainCaseDefinitions,
  listCombinerPlainCases,
  resolveCombinerPlainSchema,
} from './combiner-plain-case-definitions'

export type CombinerPlainProgrammaticSampleCase = {
  caseId: string;
  schema: Record<string, unknown>;
  summary: string;
};

export const buildCombinerPlainProgrammaticSampleCases = (
  combinerKind: CombinerKind,
): CombinerPlainProgrammaticSampleCase[] =>
  listCombinerPlainCases(combinerKind).map((sampleCase) => ({
    caseId: sampleCase.caseId,
    summary: sampleCase.summary,
    schema: resolveCombinerPlainSchema(combinerKind, sampleCase.caseId),
  }))
