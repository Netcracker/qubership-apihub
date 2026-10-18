import {
  listValueRangeDiffCases,
  resolveValueRangeDiffSchemas,
} from "../../../api-doc-viewer/src/stories/json-schema-diffs-suite/value-range-diff-samples";
import { resolveValueRangeDiffSchemasOas31 } from "../../../api-doc-viewer/src/stories/json-schema-diffs-suite/value-range-diff-oas-31-samples";

export type ValueRangeDiffFixtureListOptions = {
  includeOas31Only?: boolean;
};

export const resolveValueRangeDiffFixtureSchemas = (
  caseId: string,
  options: ValueRangeDiffFixtureListOptions = {},
): { before: object; after: object } => resolveValueRangeDiffSchemas(caseId, options);

export const resolveValueRangeDiffFixtureSchemasOas31 = (
  caseId: string,
  options: ValueRangeDiffFixtureListOptions = {},
): { before: object; after: object } => resolveValueRangeDiffSchemasOas31(caseId, options);

export const listValueRangeDiffFixtureCaseIds = (
  options: ValueRangeDiffFixtureListOptions = {},
): string[] => listValueRangeDiffCases(options).map((entry) => entry.caseId);
