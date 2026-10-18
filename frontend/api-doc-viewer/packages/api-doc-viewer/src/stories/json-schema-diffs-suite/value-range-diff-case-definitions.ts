import { buildValueRangeSchema } from "../shared/value-range-schema-builder";
import type { ValueRangeDiffCase, ValueRangeDiffCaseDefinition, ValueRangeDiffSampleListOptions } from "./value-range-diff-samples.types";

const clone = <T>(value: T): T => structuredClone(value);

const integerPlain = (): Record<string, unknown> => ({ type: "integer" });

const numberRange = (
  bounds: Parameters<typeof buildValueRangeSchema>[0] = {},
): Record<string, unknown> => buildValueRangeSchema({ type: "integer", ...bounds });

export function getValueRangeDiffCaseDefinitions(): ValueRangeDiffCaseDefinition[] {
  const definitions: ValueRangeDiffCaseDefinition[] = [];

  const base = integerPlain();
  const add = (
    slug: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    summary: string,
    extra: Partial<ValueRangeDiffCaseDefinition> = {},
  ) => definitions.push({ slug, before, after, summary, ...extra });

  add("minimum-added", base, numberRange({ minimum: 1 }), "Added minimum");
  add(
    "minimum-added-with-exclusive-minimum-true",
    base,
    numberRange({ minimum: 1, exclusiveMinimum: true }),
    "Added minimum with exclusiveMinimum = true",
  );
  add("minimum-removed", numberRange({ minimum: 1 }), base, "Removed minimum");
  add(
    "minimum-with-exclusive-minimum-true-removed",
    numberRange({ minimum: 1, exclusiveMinimum: true }),
    base,
    "Removed minimum with exclusiveMinimum = true",
  );
  add(
    "exclusive-minimum-false-to-true",
    numberRange({ minimum: 1, exclusiveMinimum: false }),
    numberRange({ minimum: 1, exclusiveMinimum: true }),
    "Changed exclusiveMinimum from false to true on existing minimum",
  );
  add(
    "exclusive-minimum-true-to-false",
    numberRange({ minimum: 1, exclusiveMinimum: true }),
    numberRange({ minimum: 1, exclusiveMinimum: false }),
    "Changed exclusiveMinimum from true to false on existing minimum",
  );

  add("maximum-added", base, numberRange({ maximum: 10 }), "Added maximum");
  add(
    "maximum-added-with-exclusive-maximum-true",
    base,
    numberRange({ maximum: 10, exclusiveMaximum: true }),
    "Added maximum with exclusiveMaximum = true",
  );
  add("maximum-removed", numberRange({ maximum: 10 }), base, "Removed maximum");
  add(
    "maximum-with-exclusive-maximum-true-removed",
    numberRange({ maximum: 10, exclusiveMaximum: true }),
    base,
    "Removed maximum with exclusiveMaximum = true",
  );
  add(
    "exclusive-maximum-false-to-true",
    numberRange({ maximum: 10, exclusiveMaximum: false }),
    numberRange({ maximum: 10, exclusiveMaximum: true }),
    "Changed exclusiveMaximum from false to true on existing maximum",
  );
  add(
    "exclusive-maximum-true-to-false",
    numberRange({ maximum: 10, exclusiveMaximum: true }),
    numberRange({ maximum: 10, exclusiveMaximum: false }),
    "Changed exclusiveMaximum from true to false on existing maximum",
  );

  add(
    "minimum-maximum-added",
    base,
    numberRange({ minimum: 1, maximum: 10 }),
    "Added minimum, maximum",
  );
  add(
    "minimum-inclusive-maximum-exclusive-added",
    base,
    numberRange({ minimum: 1, exclusiveMinimum: false, maximum: 10, exclusiveMaximum: true }),
    "Added minimum (exclusiveMinimum = false), maximum (exclusiveMaximum = true)",
  );
  add(
    "minimum-exclusive-maximum-inclusive-added",
    base,
    numberRange({ minimum: 1, exclusiveMinimum: true, maximum: 10, exclusiveMaximum: false }),
    "Added minimum (exclusiveMinimum = true), maximum (exclusiveMaximum = false)",
  );
  add(
    "minimum-maximum-both-exclusive-added",
    base,
    numberRange({ minimum: 1, exclusiveMinimum: true, maximum: 10, exclusiveMaximum: true }),
    "Added minimum (exclusiveMinimum = true), maximum (exclusiveMaximum = true)",
  );
  add(
    "minimum-maximum-removed",
    numberRange({ minimum: 1, maximum: 10 }),
    base,
    "Removed minimum, maximum",
  );
  add(
    "minimum-inclusive-maximum-exclusive-removed",
    numberRange({ minimum: 1, exclusiveMinimum: false, maximum: 10, exclusiveMaximum: true }),
    base,
    "Removed minimum (exclusiveMinimum = false), maximum (exclusiveMaximum = true)",
  );
  add(
    "minimum-exclusive-maximum-inclusive-removed",
    numberRange({ minimum: 1, exclusiveMinimum: true, maximum: 10, exclusiveMaximum: false }),
    base,
    "Removed minimum (exclusiveMinimum = true), maximum (exclusiveMaximum = false)",
  );
  add(
    "minimum-maximum-both-exclusive-removed",
    numberRange({ minimum: 1, exclusiveMinimum: true, maximum: 10, exclusiveMaximum: true }),
    base,
    "Removed minimum (exclusiveMinimum = true), maximum (exclusiveMaximum = true)",
  );

  add(
    "min-ex-max-in-min-ex-to-inclusive",
    numberRange({ minimum: 1, exclusiveMinimum: true, maximum: 10, exclusiveMaximum: false }),
    numberRange({ minimum: 1, exclusiveMinimum: false, maximum: 10, exclusiveMaximum: false }),
    "Changed exclusiveMinimum to false",
  );
  add(
    "min-ex-max-in-max-in-to-exclusive",
    numberRange({ minimum: 1, exclusiveMinimum: true, maximum: 10, exclusiveMaximum: false }),
    numberRange({ minimum: 1, exclusiveMinimum: true, maximum: 10, exclusiveMaximum: true }),
    "Changed exclusiveMaximum to true",
  );
  add(
    "min-in-max-ex-min-in-to-exclusive",
    numberRange({ minimum: 1, exclusiveMinimum: false, maximum: 10, exclusiveMaximum: true }),
    numberRange({ minimum: 1, exclusiveMinimum: true, maximum: 10, exclusiveMaximum: true }),
    "Changed exclusiveMinimum to true",
  );
  add(
    "min-in-max-ex-max-ex-to-inclusive",
    numberRange({ minimum: 1, exclusiveMinimum: false, maximum: 10, exclusiveMaximum: true }),
    numberRange({ minimum: 1, exclusiveMinimum: false, maximum: 10, exclusiveMaximum: false }),
    "Changed exclusiveMaximum to false",
  );
  add(
    "min-in-max-in-min-in-to-exclusive",
    numberRange({ minimum: 1, exclusiveMinimum: false, maximum: 10, exclusiveMaximum: false }),
    numberRange({ minimum: 1, exclusiveMinimum: true, maximum: 10, exclusiveMaximum: false }),
    "Changed exclusiveMinimum to true",
  );
  add(
    "min-in-max-in-max-in-to-exclusive",
    numberRange({ minimum: 1, exclusiveMinimum: false, maximum: 10, exclusiveMaximum: false }),
    numberRange({ minimum: 1, exclusiveMinimum: false, maximum: 10, exclusiveMaximum: true }),
    "Changed exclusiveMaximum to true",
  );
  add(
    "min-in-max-in-both-to-exclusive",
    numberRange({ minimum: 1, exclusiveMinimum: false, maximum: 10, exclusiveMaximum: false }),
    numberRange({ minimum: 1, exclusiveMinimum: true, maximum: 10, exclusiveMaximum: true }),
    "Changed exclusiveMinimum and exclusiveMaximum to true",
  );
  add(
    "min-ex-max-ex-min-ex-to-inclusive",
    numberRange({ minimum: 1, exclusiveMinimum: true, maximum: 10, exclusiveMaximum: true }),
    numberRange({ minimum: 1, exclusiveMinimum: false, maximum: 10, exclusiveMaximum: true }),
    "Changed exclusiveMinimum to false",
  );
  add(
    "min-ex-max-ex-max-ex-to-inclusive",
    numberRange({ minimum: 1, exclusiveMinimum: true, maximum: 10, exclusiveMaximum: true }),
    numberRange({ minimum: 1, exclusiveMinimum: true, maximum: 10, exclusiveMaximum: false }),
    "Changed exclusiveMaximum to false",
  );
  add(
    "min-ex-max-ex-both-to-inclusive",
    numberRange({ minimum: 1, exclusiveMinimum: true, maximum: 10, exclusiveMaximum: true }),
    numberRange({ minimum: 1, exclusiveMinimum: false, maximum: 10, exclusiveMaximum: false }),
    "Changed exclusiveMinimum and exclusiveMaximum to false",
  );

  const unchangedMinInclusive = numberRange({ minimum: 1, exclusiveMinimum: false });
  add(
    "unchanged-minimum-inclusive",
    unchangedMinInclusive,
    clone(unchangedMinInclusive),
    "Unchanged minimum (exclusiveMinimum = false)",
  );
  const unchangedMinExclusive = numberRange({ minimum: 1, exclusiveMinimum: true });
  add(
    "unchanged-minimum-exclusive",
    unchangedMinExclusive,
    clone(unchangedMinExclusive),
    "Unchanged minimum (exclusiveMinimum = true)",
  );
  const unchangedMaxInclusive = numberRange({ maximum: 10, exclusiveMaximum: false });
  add(
    "unchanged-maximum-inclusive",
    unchangedMaxInclusive,
    clone(unchangedMaxInclusive),
    "Unchanged maximum (exclusiveMaximum = false)",
  );
  const unchangedMaxExclusive = numberRange({ maximum: 10, exclusiveMaximum: true });
  add(
    "unchanged-maximum-exclusive",
    unchangedMaxExclusive,
    clone(unchangedMaxExclusive),
    "Unchanged maximum (exclusiveMaximum = true)",
  );
  const unchangedBothInclusive = numberRange({
    minimum: 1,
    exclusiveMinimum: false,
    maximum: 10,
    exclusiveMaximum: false,
  });
  add(
    "unchanged-min-max-inclusive",
    unchangedBothInclusive,
    clone(unchangedBothInclusive),
    "Unchanged minimum (exclusiveMinimum = false), maximum (exclusiveMaximum = false)",
  );
  const unchangedMinInMaxEx = numberRange({
    minimum: 1,
    exclusiveMinimum: false,
    maximum: 10,
    exclusiveMaximum: true,
  });
  add(
    "unchanged-min-inclusive-max-exclusive",
    unchangedMinInMaxEx,
    clone(unchangedMinInMaxEx),
    "Unchanged minimum (exclusiveMinimum = false), maximum (exclusiveMaximum = true)",
  );
  const unchangedMinExMaxEx = numberRange({
    minimum: 1,
    exclusiveMinimum: true,
    maximum: 10,
    exclusiveMaximum: true,
  });
  add(
    "unchanged-min-max-both-exclusive",
    unchangedMinExMaxEx,
    clone(unchangedMinExMaxEx),
    "Unchanged minimum (exclusiveMinimum = true), maximum (exclusiveMaximum = true)",
  );

  add(
    "min-in-add-max-in",
    numberRange({ minimum: 1, exclusiveMinimum: false }),
    numberRange({ minimum: 1, exclusiveMinimum: false, maximum: 10, exclusiveMaximum: false }),
    "Added inclusive maximum to existing inclusive minimum",
  );
  add(
    "min-in-add-max-ex",
    numberRange({ minimum: 1, exclusiveMinimum: false }),
    numberRange({ minimum: 1, exclusiveMinimum: false, maximum: 10, exclusiveMaximum: true }),
    "Added exclusive maximum to existing inclusive minimum",
  );
  add(
    "min-ex-add-max-in",
    numberRange({ minimum: 1, exclusiveMinimum: true }),
    numberRange({ minimum: 1, exclusiveMinimum: true, maximum: 10, exclusiveMaximum: false }),
    "Added inclusive maximum to existing exclusive minimum",
  );
  add(
    "min-ex-add-max-ex",
    numberRange({ minimum: 1, exclusiveMinimum: true }),
    numberRange({ minimum: 1, exclusiveMinimum: true, maximum: 10, exclusiveMaximum: true }),
    "Added exclusive maximum to existing exclusive minimum",
  );
  add(
    "max-in-add-min-in",
    numberRange({ maximum: 10, exclusiveMaximum: false }),
    numberRange({ minimum: 1, exclusiveMinimum: false, maximum: 10, exclusiveMaximum: false }),
    "Added inclusive minimum to existing inclusive maximum",
  );
  add(
    "max-in-add-min-ex",
    numberRange({ maximum: 10, exclusiveMaximum: false }),
    numberRange({ minimum: 1, exclusiveMinimum: true, maximum: 10, exclusiveMaximum: false }),
    "Added exclusive minimum to existing inclusive maximum",
  );
  add(
    "max-ex-add-min-in",
    numberRange({ maximum: 10, exclusiveMaximum: true }),
    numberRange({ minimum: 1, exclusiveMinimum: false, maximum: 10, exclusiveMaximum: true }),
    "Added inclusive minimum to existing exclusive maximum",
  );
  add(
    "max-ex-add-min-ex",
    numberRange({ maximum: 10, exclusiveMaximum: true }),
    numberRange({ minimum: 1, exclusiveMinimum: true, maximum: 10, exclusiveMaximum: true }),
    "Added exclusive minimum to existing exclusive maximum",
  );

  const minInMaxIn = numberRange({
    minimum: 1,
    exclusiveMinimum: false,
    maximum: 10,
    exclusiveMaximum: false,
  });
  add(
    "min-in-max-in-remove-minimum",
    minInMaxIn,
    numberRange({ maximum: 10, exclusiveMaximum: false }),
    "Removed minimum from existing inclusive minimum and inclusive maximum",
  );
  add(
    "min-in-max-in-remove-maximum",
    minInMaxIn,
    numberRange({ minimum: 1, exclusiveMinimum: false }),
    "Removed maximum from existing inclusive minimum and inclusive maximum",
  );

  const minExMaxEx = numberRange({
    minimum: 1,
    exclusiveMinimum: true,
    maximum: 10,
    exclusiveMaximum: true,
  });
  add(
    "min-ex-max-ex-remove-minimum",
    minExMaxEx,
    numberRange({ maximum: 10, exclusiveMaximum: true }),
    "Removed minimum from existing exclusive minimum and exclusive maximum",
  );
  add(
    "min-ex-max-ex-remove-maximum",
    minExMaxEx,
    numberRange({ minimum: 1, exclusiveMinimum: true }),
    "Removed maximum from existing exclusive minimum and exclusive maximum",
  );

  const minInMaxEx = numberRange({
    minimum: 1,
    exclusiveMinimum: false,
    maximum: 10,
    exclusiveMaximum: true,
  });
  add(
    "min-in-max-ex-remove-minimum",
    minInMaxEx,
    numberRange({ maximum: 10, exclusiveMaximum: true }),
    "Removed minimum from existing inclusive minimum and exclusive maximum",
  );
  add(
    "min-in-max-ex-remove-maximum",
    minInMaxEx,
    numberRange({ minimum: 1, exclusiveMinimum: false }),
    "Removed maximum from existing inclusive minimum and exclusive maximum",
  );

  const minExMaxIn = numberRange({
    minimum: 1,
    exclusiveMinimum: true,
    maximum: 10,
    exclusiveMaximum: false,
  });
  add(
    "min-ex-max-in-remove-minimum",
    minExMaxIn,
    numberRange({ maximum: 10, exclusiveMaximum: false }),
    "Removed minimum from existing exclusive minimum and inclusive maximum",
  );
  add(
    "min-ex-max-in-remove-maximum",
    minExMaxIn,
    numberRange({ minimum: 1, exclusiveMinimum: true }),
    "Removed maximum from existing exclusive minimum and inclusive maximum",
  );

  add(
    "exclusive-minimum-numeric-added",
    base,
    numberRange({ exclusiveMinimum: 2 }),
    "Added exclusiveMinimum (numeric, OAS 3.1)",
    { oas31Only: true },
  );
  add(
    "exclusive-minimum-numeric-removed",
    numberRange({ exclusiveMinimum: 2 }),
    base,
    "Removed exclusiveMinimum (numeric, OAS 3.1)",
    { oas31Only: true },
  );
  add(
    "exclusive-maximum-numeric-added",
    base,
    numberRange({ exclusiveMaximum: 10 }),
    "Added exclusiveMaximum (numeric, OAS 3.1)",
    { oas31Only: true },
  );
  add(
    "exclusive-maximum-numeric-removed",
    numberRange({ exclusiveMaximum: 10 }),
    base,
    "Removed exclusiveMaximum (numeric, OAS 3.1)",
    { oas31Only: true },
  );

  return definitions;
}

export function listValueRangeDiffCases(
  options: ValueRangeDiffSampleListOptions = {},
): ValueRangeDiffCase[] {
  const { includeOas31Only = false } = options;
  const filtered = getValueRangeDiffCaseDefinitions().filter(
    (definition) => includeOas31Only || !definition.oas31Only,
  );
  return filtered.map((definition, index) => ({
    ...definition,
    caseId: `${String(index + 1).padStart(3, "0")}-${definition.slug}`,
  }));
}

export const toValueRangeCaseExportName = (caseId: string): string =>
  `Case_${caseId.replace(/[.-]/g, "_")}`;
