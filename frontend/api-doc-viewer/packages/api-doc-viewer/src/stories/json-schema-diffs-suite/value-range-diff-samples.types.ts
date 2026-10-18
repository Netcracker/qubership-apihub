export type ValueRangeDiffCaseDefinition = {
  slug: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  summary: string;
  oas31Only?: boolean;
};

export type ValueRangeDiffCase = ValueRangeDiffCaseDefinition & {
  caseId: string;
};

export type ValueRangeDiffSampleListOptions = {
  /** When true, include OAS 3.1-only numeric exclusive cases (57 total). When false, 53 cases. */
  includeOas31Only?: boolean;
};

export type ValueRangeDiffSampleResolveOptions = ValueRangeDiffSampleListOptions & {
  /** Override schema `type` on both sides (defaults to `integer`). */
  type?: "integer" | "number";
};
