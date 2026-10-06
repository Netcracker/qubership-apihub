import {
  buildComprehensiveTypeSchema,
  COMBINER_KINDS,
  COMBINER_SCHEMA_TYPES,
  type CombinerKind,
  combinerKindSlug,
  FORMAT_VALUE,
  titleLabelFor,
  wrapInCombiner,
} from '../shared/combiner-schema-builder'

export type CombinerPlainCaseDefinition = {
  slug: string;
  schema: Record<string, unknown>;
  summary: string;
};

export type CombinerPlainCase = CombinerPlainCaseDefinition & {
  caseId: string;
};

const pushCase = (
  definitions: CombinerPlainCaseDefinition[],
  slug: string,
  schema: Record<string, unknown>,
  summary: string,
) => definitions.push({ slug, schema, summary })

/**
 * Suite 1 "Simple combiner" + Suite 2 "Complex combiner (2 levels)" cases for one combiner kind
 * (matches the sample sub-directory: oneOf / anyOf / allOf). See packages/samples/json-schema/README.md for the
 * terminology and the per-combiner READMEs for the case matrix.
 */
export function getCombinerPlainCaseDefinitions(
  combinerKind: CombinerKind,
): CombinerPlainCaseDefinition[] {
  const definitions: CombinerPlainCaseDefinition[] = []

  // Suite 1, case 1: 1st-combiner contains 1 option = comprehensive type-schema (per type).
  for (const type of COMBINER_SCHEMA_TYPES) {
    pushCase(
      definitions,
      `${type}-schema`,
      wrapInCombiner(combinerKind, [buildComprehensiveTypeSchema(type)]),
      `Simple combiner: single ${type} option (comprehensive schema)`,
    )
  }

  // Suite 1, case 2: 1st-combiner contains all possible type options (single, not iterated per type).
  pushCase(
    definitions,
    'all-types-schema',
    wrapInCombiner(
      combinerKind,
      COMBINER_SCHEMA_TYPES.map((type) => buildComprehensiveTypeSchema(type)),
    ),
    'Simple combiner: options of all schema types',
  )

  // Suite 1, cases 3-4: title/format matrix (type-title-format-schema), per type.
  for (const type of COMBINER_SCHEMA_TYPES) {
    const titleLabel = titleLabelFor(type)

    pushCase(
      definitions,
      `${type}-${titleLabel}-NULL-schema`,
      wrapInCombiner(combinerKind, [buildComprehensiveTypeSchema(type, { title: titleLabel })]),
      `Simple combiner: single ${type} option with title "${titleLabel}", no format`,
    )
    pushCase(
      definitions,
      `${type}-NULL-${FORMAT_VALUE}-schema`,
      wrapInCombiner(combinerKind, [buildComprehensiveTypeSchema(type, { format: FORMAT_VALUE })]),
      `Simple combiner: single ${type} option with format "${FORMAT_VALUE}", no title`,
    )
    pushCase(
      definitions,
      `${type}-${titleLabel}-${FORMAT_VALUE}-schema`,
      wrapInCombiner(combinerKind, [
        buildComprehensiveTypeSchema(type, { title: titleLabel, format: FORMAT_VALUE }),
      ]),
      `Simple combiner: single ${type} option with title "${titleLabel}" and format "${FORMAT_VALUE}"`,
    )
  }

  // Suite 2, case 1 (term 6, type-schema-combinerKind): 1st-combiner (D, this directory's own kind)
  // has 1 option which is itself a 2nd-combiner whose kind is named by the suffix -- independently of
  // D, so all 3 kinds (including D itself, i.e. D nested inside D) are exercised. First variant of
  // the 2nd-combiner is the type-schema. Two combiner levels total.
  for (const secondLevelKind of COMBINER_KINDS) {
    const secondLevelSlug = combinerKindSlug(secondLevelKind)
    for (const type of COMBINER_SCHEMA_TYPES) {
      pushCase(
        definitions,
        `${type}-schema-${secondLevelSlug}`,
        wrapInCombiner(combinerKind, [
          wrapInCombiner(secondLevelKind, [buildComprehensiveTypeSchema(type)]),
        ]),
        `Complex combiner: single ${type} option, 2nd-combiner (${secondLevelKind}) nested inside 1st-combiner (${combinerKind})`,
      )
    }
  }

  // Suite 2, cases 2-4 (term 7, type-schema-combinerKind1-combinerKind2): 1st-combiner (D) ->
  // 2nd-combiner (combinerKind1) -> 3rd-combiner (combinerKind2) -> first variant = type-schema.
  // Both nested-combiner kinds vary independently over all 3 kinds (9 combinations), matching the
  // same "all possible 2nd-level combiners" iteration as the single-suffix cases above, recursively
  // applied one level deeper. Three combiner levels total.
  for (const secondLevelKind of COMBINER_KINDS) {
    const secondLevelSlug = combinerKindSlug(secondLevelKind)
    for (const thirdLevelKind of COMBINER_KINDS) {
      const thirdLevelSlug = combinerKindSlug(thirdLevelKind)
      for (const type of COMBINER_SCHEMA_TYPES) {
        pushCase(
          definitions,
          `${type}-schema-${secondLevelSlug}-${thirdLevelSlug}`,
          wrapInCombiner(combinerKind, [
            wrapInCombiner(secondLevelKind, [
              wrapInCombiner(thirdLevelKind, [buildComprehensiveTypeSchema(type)]),
            ]),
          ]),
          `Complex combiner: single ${type} option, 3rd-combiner (${thirdLevelKind}) nested inside 2nd-combiner (${secondLevelKind}) inside 1st-combiner (${combinerKind})`,
        )
      }
    }
  }

  return definitions
}

export function listCombinerPlainCases(combinerKind: CombinerKind): CombinerPlainCase[] {
  return getCombinerPlainCaseDefinitions(combinerKind).map((definition, index) => ({
    ...definition,
    caseId: `${String(index + 1).padStart(3, '0')}-${definition.slug}`,
  }))
}

export function resolveCombinerPlainSchema(
  combinerKind: CombinerKind,
  caseId: string,
): Record<string, unknown> {
  const sampleCase = listCombinerPlainCases(combinerKind).find((entry) => entry.caseId === caseId)
  if (!sampleCase) {
    throw new Error(`Combiner plain case not found: ${combinerKind}/${caseId}`)
  }
  return sampleCase.schema
}
