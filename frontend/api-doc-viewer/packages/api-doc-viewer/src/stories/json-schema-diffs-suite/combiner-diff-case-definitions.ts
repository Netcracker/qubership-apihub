import {
  COMBINER_KINDS,
  COMBINER_SCHEMA_TYPES,
  FORMAT_VALUE,
  FORMAT_VALUE_ALT,
  buildComprehensiveTypeSchema,
  combinerKindSlug,
  titleLabelFor,
  wrapInCombiner,
  type CombinerKind,
  type CombinerSchemaType,
} from "../shared/combiner-schema-builder";

export type CombinerDiffCaseDefinition = {
  slug: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  summary: string;
};

export type CombinerDiffCase = CombinerDiffCaseDefinition & {
  caseId: string;
};

type AddCaseFn = (
  slug: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  summary: string,
) => void;

const buildAllTypesOptions = (): Record<string, unknown>[] =>
  COMBINER_SCHEMA_TYPES.map((type) => buildComprehensiveTypeSchema(type));

/**
 * Suite 1 "Simple combiner":
 * - cases 1-2: full pairwise add/remove-option matrix (6x5 ordered type pairs).
 * - case 3: 1st-combiner holding all 6 type options, with single-field mutations (title/format
 *   add/remove/replace, type change to every other type) applied to each option position in turn.
 */
const collectSuite1SimpleCombinerCases = (combinerKind: CombinerKind, add: AddCaseFn) => {
  for (const type1 of COMBINER_SCHEMA_TYPES) {
    for (const type2 of COMBINER_SCHEMA_TYPES) {
      if (type1 === type2) {
        continue;
      }
      const single = wrapInCombiner(combinerKind, [buildComprehensiveTypeSchema(type1)]);
      const pair = wrapInCombiner(combinerKind, [
        buildComprehensiveTypeSchema(type1),
        buildComprehensiveTypeSchema(type2),
      ]);
      add(`${type1}-add-option-${type2}`, single, pair, `Added ${type2} option to existing ${type1} option`);
      add(`${type1}-remove-option-${type2}`, pair, single, `Removed ${type2} option, keeping ${type1}`);
    }
  }

  for (let position = 0; position < COMBINER_SCHEMA_TYPES.length; position += 1) {
    const targetType = COMBINER_SCHEMA_TYPES[position];
    const titleLabel = titleLabelFor(targetType);
    const titleLabelAlt = `Updated${titleLabel}`;

    const baseline = buildAllTypesOptions();
    const withTitle = buildAllTypesOptions();
    withTitle[position] = buildComprehensiveTypeSchema(targetType, { title: titleLabel });
    const withTitleAlt = buildAllTypesOptions();
    withTitleAlt[position] = buildComprehensiveTypeSchema(targetType, { title: titleLabelAlt });
    const withFormat = buildAllTypesOptions();
    withFormat[position] = buildComprehensiveTypeSchema(targetType, { format: FORMAT_VALUE });
    const withFormatAlt = buildAllTypesOptions();
    withFormatAlt[position] = buildComprehensiveTypeSchema(targetType, { format: FORMAT_VALUE_ALT });

    add(
      `all-types-${targetType}-title-added`,
      wrapInCombiner(combinerKind, baseline),
      wrapInCombiner(combinerKind, withTitle),
      `All-types combiner: added title "${titleLabel}" to the ${targetType} option`,
    );
    add(
      `all-types-${targetType}-title-removed`,
      wrapInCombiner(combinerKind, withTitle),
      wrapInCombiner(combinerKind, baseline),
      `All-types combiner: removed title from the ${targetType} option`,
    );
    add(
      `all-types-${targetType}-title-replaced`,
      wrapInCombiner(combinerKind, withTitle),
      wrapInCombiner(combinerKind, withTitleAlt),
      `All-types combiner: replaced title on the ${targetType} option`,
    );
    add(
      `all-types-${targetType}-format-added`,
      wrapInCombiner(combinerKind, baseline),
      wrapInCombiner(combinerKind, withFormat),
      `All-types combiner: added format "${FORMAT_VALUE}" to the ${targetType} option`,
    );
    add(
      `all-types-${targetType}-format-removed`,
      wrapInCombiner(combinerKind, withFormat),
      wrapInCombiner(combinerKind, baseline),
      `All-types combiner: removed format from the ${targetType} option`,
    );
    add(
      `all-types-${targetType}-format-replaced`,
      wrapInCombiner(combinerKind, withFormat),
      wrapInCombiner(combinerKind, withFormatAlt),
      `All-types combiner: replaced format on the ${targetType} option`,
    );

    for (const otherType of COMBINER_SCHEMA_TYPES) {
      if (otherType === targetType) {
        continue;
      }
      const withTypeChanged = buildAllTypesOptions();
      withTypeChanged[position] = buildComprehensiveTypeSchema(otherType);
      add(
        `all-types-${targetType}-to-${otherType}`,
        wrapInCombiner(combinerKind, baseline),
        wrapInCombiner(combinerKind, withTypeChanged),
        `All-types combiner: changed the ${targetType} option's type to ${otherType}`,
      );
    }
  }
};

const REPRESENTATIVE_TYPE_1: CombinerSchemaType = "string";
const REPRESENTATIVE_TYPE_2: CombinerSchemaType = "number";
const REPRESENTATIVE_TARGET_POSITION = 0;

type RepresentativeMutation = {
  slug: string;
  before: Record<string, unknown>[];
  after: Record<string, unknown>[];
  label: string;
};

/**
 * Suite 2 "Complex combiner":
 * - cases 1-2: add/remove a nested-combiner-wrapped option, for a representative type pair, across
 *   all 3 nested-combiner kinds.
 * - case 3: 2nd-combiner shaped like Suite 1 case 3 (representative subset of mutations), across
 *   all 3 nested-combiner kinds.
 * - case 4: 3rd-combiner nested inside a 2nd-combiner, both shaped like Suite 1 case 3
 *   (representative subset of mutations), across all 3x3 nested-combiner-kind pairs.
 */
const collectSuite2ComplexCombinerCases = (combinerKind: CombinerKind, add: AddCaseFn) => {
  for (const nestedKind of COMBINER_KINDS) {
    const nestedSlug = combinerKindSlug(nestedKind);
    const single = wrapInCombiner(combinerKind, [buildComprehensiveTypeSchema(REPRESENTATIVE_TYPE_1)]);
    const withNested = wrapInCombiner(combinerKind, [
      buildComprehensiveTypeSchema(REPRESENTATIVE_TYPE_1),
      wrapInCombiner(nestedKind, [buildComprehensiveTypeSchema(REPRESENTATIVE_TYPE_2)]),
    ]);
    add(
      `add-option-${REPRESENTATIVE_TYPE_2}-wrapped-in-${nestedSlug}`,
      single,
      withNested,
      `Added ${REPRESENTATIVE_TYPE_2} option wrapped in nested ${nestedKind}`,
    );
    add(
      `remove-option-${REPRESENTATIVE_TYPE_2}-wrapped-in-${nestedSlug}`,
      withNested,
      single,
      `Removed ${REPRESENTATIVE_TYPE_2} option that was wrapped in nested ${nestedKind}`,
    );
  }

  const targetType = COMBINER_SCHEMA_TYPES[REPRESENTATIVE_TARGET_POSITION];
  const titleLabel = titleLabelFor(targetType);
  const titleLabelAlt = `Updated${titleLabel}`;
  const otherType =
    COMBINER_SCHEMA_TYPES[(REPRESENTATIVE_TARGET_POSITION + 1) % COMBINER_SCHEMA_TYPES.length];

  const baseline = buildAllTypesOptions();
  const withTitle = buildAllTypesOptions();
  withTitle[REPRESENTATIVE_TARGET_POSITION] = buildComprehensiveTypeSchema(targetType, {
    title: titleLabel,
  });
  const withTitleAlt = buildAllTypesOptions();
  withTitleAlt[REPRESENTATIVE_TARGET_POSITION] = buildComprehensiveTypeSchema(targetType, {
    title: titleLabelAlt,
  });
  const withFormat = buildAllTypesOptions();
  withFormat[REPRESENTATIVE_TARGET_POSITION] = buildComprehensiveTypeSchema(targetType, {
    format: FORMAT_VALUE,
  });
  const withTypeChanged = buildAllTypesOptions();
  withTypeChanged[REPRESENTATIVE_TARGET_POSITION] = buildComprehensiveTypeSchema(otherType);

  const representativeMutations: RepresentativeMutation[] = [
    { slug: "title-added", before: baseline, after: withTitle, label: `added title "${titleLabel}"` },
    { slug: "title-removed", before: withTitle, after: baseline, label: "removed title" },
    { slug: "title-replaced", before: withTitle, after: withTitleAlt, label: "replaced title" },
    {
      slug: "format-added",
      before: baseline,
      after: withFormat,
      label: `added format "${FORMAT_VALUE}"`,
    },
    { slug: "format-removed", before: withFormat, after: baseline, label: "removed format" },
    {
      slug: "type-changed",
      before: baseline,
      after: withTypeChanged,
      label: `changed type to ${otherType}`,
    },
  ];

  for (const nestedKind of COMBINER_KINDS) {
    const nestedSlug = combinerKindSlug(nestedKind);
    for (const mutation of representativeMutations) {
      add(
        `nested-${nestedSlug}-${targetType}-${mutation.slug}`,
        wrapInCombiner(combinerKind, [wrapInCombiner(nestedKind, mutation.before)]),
        wrapInCombiner(combinerKind, [wrapInCombiner(nestedKind, mutation.after)]),
        `2nd-combiner (${nestedKind}): ${mutation.label} on the ${targetType} option`,
      );
    }
  }

  const deepMutations = representativeMutations.slice(0, 3);
  for (const nestedKind1 of COMBINER_KINDS) {
    const nestedSlug1 = combinerKindSlug(nestedKind1);
    for (const nestedKind2 of COMBINER_KINDS) {
      const nestedSlug2 = combinerKindSlug(nestedKind2);
      for (const mutation of deepMutations) {
        add(
          `nested-${nestedSlug1}-nested-${nestedSlug2}-${targetType}-${mutation.slug}`,
          wrapInCombiner(combinerKind, [
            wrapInCombiner(nestedKind1, [wrapInCombiner(nestedKind2, mutation.before)]),
          ]),
          wrapInCombiner(combinerKind, [
            wrapInCombiner(nestedKind1, [wrapInCombiner(nestedKind2, mutation.after)]),
          ]),
          `3rd-combiner (${nestedKind2} inside ${nestedKind1}): ${mutation.label} on the ${targetType} option`,
        );
      }
    }
  }
};

/**
 * All combiner diff cases for one combiner kind (matches the sample sub-directory: oneOf / anyOf /
 * allOf). See packages/samples/json-schema-diffs/{oneOf,anyOf,allOf}/README.md for the case matrix.
 */
export function getCombinerDiffCaseDefinitions(combinerKind: CombinerKind): CombinerDiffCaseDefinition[] {
  const definitions: CombinerDiffCaseDefinition[] = [];
  const add: AddCaseFn = (slug, before, after, summary) =>
    definitions.push({ slug, before, after, summary });

  collectSuite1SimpleCombinerCases(combinerKind, add);
  collectSuite2ComplexCombinerCases(combinerKind, add);

  return definitions;
}

export function listCombinerDiffCases(combinerKind: CombinerKind): CombinerDiffCase[] {
  return getCombinerDiffCaseDefinitions(combinerKind).map((definition, index) => ({
    ...definition,
    caseId: `${String(index + 1).padStart(3, "0")}-${definition.slug}`,
  }));
}
