import { buildValueRangeSchema, formatValueRangeCaseTitle, ValueRangeBounds } from "../shared/value-range-schema-builder";


export type ValueRangePlainCaseDefinition = {
  slug: string;
  bounds: ValueRangeBounds;
  summary: string;
  oas31Only?: boolean;
};

export type ValueRangePlainCase = ValueRangePlainCaseDefinition & {
  caseId: string;
};

export type ValueRangePlainSampleListOptions = {
  includeOas31Only?: boolean;
};

export type ValueRangePlainSampleResolveOptions = ValueRangePlainSampleListOptions & {
  type?: "integer" | "number";
};

const definePlainCase = (
  slug: string,
  bounds: ValueRangeBounds,
  summary: string,
  extra: Partial<ValueRangePlainCaseDefinition> = {},
): ValueRangePlainCaseDefinition => ({ slug, bounds, summary, ...extra });

export function getValueRangePlainCaseDefinitions(): ValueRangePlainCaseDefinition[] {
  const definitions: ValueRangePlainCaseDefinition[] = [];

  const add = (
    slug: string,
    bounds: ValueRangeBounds,
    summary: string,
    extra: Partial<ValueRangePlainCaseDefinition> = {},
  ) => definitions.push(definePlainCase(slug, bounds, summary, extra));

  add("min-0-inclusive", { minimum: 0 }, "Minimum 0 (inclusive)");
  add("min-1-inclusive", { minimum: 1 }, "Minimum 1 (inclusive)");
  add(
    "min-1-exclusive-oas30",
    { minimum: 1, exclusiveMinimum: true },
    "Minimum 1 (exclusive, OAS 3.0 boolean)",
  );
  add(
    "min-1-exclusive-oas31",
    { exclusiveMinimum: 1 },
    "Exclusive minimum 1 (numeric, OAS 3.1)",
    { oas31Only: true },
  );

  add("max-0-inclusive", { maximum: 0 }, "Maximum 0 (inclusive)");
  add("max-10-inclusive", { maximum: 10 }, "Maximum 10 (inclusive)");
  add(
    "max-10-exclusive-oas30",
    { maximum: 10, exclusiveMaximum: true },
    "Maximum 10 (exclusive, OAS 3.0 boolean)",
  );
  add(
    "max-10-exclusive-oas31",
    { exclusiveMaximum: 10 },
    "Exclusive maximum 10 (numeric, OAS 3.1)",
    { oas31Only: true },
  );

  add(
    "min-0-max-10-both-inclusive",
    { minimum: 0, maximum: 10 },
    "Minimum 0 and maximum 10 (both inclusive)",
  );
  add(
    "min-1-max-10-both-inclusive",
    { minimum: 1, maximum: 10 },
    "Minimum 1 and maximum 10 (both inclusive)",
  );
  add(
    "min-0-max-10-max-exclusive-oas30",
    { minimum: 0, maximum: 10, exclusiveMaximum: true },
    "Minimum 0 (inclusive) and maximum 10 (exclusive, OAS 3.0 boolean)",
  );
  add(
    "min-1-max-10-max-exclusive-oas30",
    { minimum: 1, maximum: 10, exclusiveMaximum: true },
    "Minimum 1 (inclusive) and maximum 10 (exclusive, OAS 3.0 boolean)",
  );
  add(
    "min-1-exclusive-max-10-inclusive-oas30",
    { minimum: 1, exclusiveMinimum: true, maximum: 10 },
    "Minimum 1 (exclusive) and maximum 10 (inclusive, OAS 3.0 boolean)",
  );
  add(
    "min-1-inclusive-max-10-exclusive-oas30",
    { minimum: 1, maximum: 10, exclusiveMaximum: true },
    "Minimum 1 (inclusive) and maximum 10 (exclusive, OAS 3.0 boolean)",
  );
  add(
    "min-1-exclusive-max-10-exclusive-oas30",
    { minimum: 1, exclusiveMinimum: true, maximum: 10, exclusiveMaximum: true },
    "Minimum 1 and maximum 10 (both exclusive, OAS 3.0 boolean)",
  );
  add(
    "min-0-max-10-both-exclusive-oas31",
    { exclusiveMinimum: 0, exclusiveMaximum: 10 },
    "Exclusive minimum 0 and exclusive maximum 10 (numeric, OAS 3.1)",
    { oas31Only: true },
  );
  add(
    "min-1-max-10-both-exclusive-oas31",
    { exclusiveMinimum: 1, exclusiveMaximum: 10 },
    "Exclusive minimum 1 and exclusive maximum 10 (numeric, OAS 3.1)",
    { oas31Only: true },
  );
  add(
    "min-1-inclusive-max-10-exclusive-oas31",
    { minimum: 1, exclusiveMaximum: 10 },
    "Minimum 1 (inclusive) and exclusive maximum 10 (numeric, OAS 3.1)",
    { oas31Only: true },
  );
  add(
    "min-1-exclusive-max-10-inclusive-oas31",
    { exclusiveMinimum: 1, maximum: 10 },
    "Exclusive minimum 1 and maximum 10 (inclusive, OAS 3.1)",
    { oas31Only: true },
  );

  return definitions;
}

export function listValueRangePlainCases(
  options: ValueRangePlainSampleListOptions = {},
): ValueRangePlainCase[] {
  const { includeOas31Only = false } = options;
  const filtered = getValueRangePlainCaseDefinitions().filter(
    (definition) => includeOas31Only || !definition.oas31Only,
  );
  return filtered.map((definition, index) => ({
    ...definition,
    caseId: `${String(index + 1).padStart(3, "0")}-value-range-${definition.slug}`,
  }));
}

export const resolveValueRangePlainSchema = (
  caseId: string,
  options: ValueRangePlainSampleResolveOptions = {},
): Record<string, unknown> => {
  const sampleCase = listValueRangePlainCases(options).find((entry) => entry.caseId === caseId);
  if (!sampleCase) {
    throw new Error(`Value-range plain case not found: ${caseId}`);
  }
  const { type = "integer" } = options;
  return buildValueRangeSchema({
    type,
    title: formatValueRangeCaseTitle(sampleCase.slug, sampleCase.summary),
    ...sampleCase.bounds,
  });
};

export const toValueRangePlainCaseExportName = (caseId: string): string =>
  `Case_${caseId.replace(/[.-]/g, "_")}`;
