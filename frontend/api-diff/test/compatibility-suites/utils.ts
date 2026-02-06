import { loadYaml, OriginLeafs } from '@netcracker/qubership-apihub-api-unifier'
import {
  getCompatibilitySuite,
  getCompatibilitySuiteSpecificationVersionPairs,
  SpecificationVersionPair,
  TEST_SPEC_TYPE_GRAPH_QL,
  TEST_SPEC_TYPE_OPEN_API,
  TestSpecType,
} from '@netcracker/qubership-apihub-compatibility-suites'
import { buildFromSchema, GraphApiDirectiveDefinition } from '@netcracker/qubership-apihub-graphapi'
import { isObject } from '@netcracker/qubership-apihub-json-crawl'
import { buildSchema } from 'graphql/utilities'
import { apiDiff, CompareOptions, CompareResult, Diff } from '../../src'
import { RUNTIME_DIRECTIVE_LOCATIONS } from '../../src/graphapi'
import { TEST_DIFF_FLAG, TEST_ORIGINS_FLAG, TEST_SYNTHETIC_TITLE_FLAG } from '../helper'

const toMajorMinor = (v: string): string => (v.startsWith('3.1') ? '3.1' : '3.0')

const pairTag = (pair: SpecificationVersionPair): string => `${toMajorMinor(pair[0])}-${toMajorMinor(pair[1])}`

type OpenApiVersionPairCaseContext = {
  suiteId: string
  testId: string
  beforeVersion: string
  afterVersion: string
  diffs: Array<Diff>
  merged: unknown
}

/**
 * Initializes custom Jest wrapper `caseForOpenApiVersionPairs` on `test`/`it` and their `.only`/`.skip` variants.
 *
 * Why:
 * - **Runtime**: makes calls like `test.caseForOpenApiVersionPairs(...)` actually exist (they call into our generator).
 * - **IDE/Test Explorer**: many Jest integrations recognize only expressions starting with `test`/`it`, so
 *   `test.caseForOpenApiVersionPairs(...)` is easier for them to detect than a standalone helper call.
 *
 * Call this once from Jest `setupFilesAfterEnv` (see `test/setup/jest-wrappers.ts`).
 */
export function initCaseForOpenApiVersionPairs(): void {
  const attach = (jestIt: typeof test): void => {
    (jestIt as unknown as Record<string, unknown>).caseForOpenApiVersionPairs = (
      testId: string,
      suiteId: string,
      fn: (ctx: OpenApiVersionPairCaseContext) => Promise<void> | void,
    ): void => {
      runCaseForOpenApiVersionPairs(jestIt, suiteId, testId, fn)
    }
  }

  attach(test)
  attach(test.only)
  attach(test.skip)

  attach(it)
  attach(it.only)
  attach(it.skip)
}

function runCaseForOpenApiVersionPairs(
  jestTest: typeof test,
  suiteId: string,
  testId: string,
  fn: (ctx: OpenApiVersionPairCaseContext) => Promise<void> | void,
): void {
  const pairs = getCompatibilitySuiteSpecificationVersionPairs(TEST_SPEC_TYPE_OPEN_API, suiteId, testId)

  if (pairs.length === 0) {
    jestTest(`${testId} (no OpenAPI version pairs)`, () => {
      throw new Error(`No OpenAPI version pairs for ${suiteId}/${testId}`)
    })
    return
  }

  for (const pair of pairs) {
    const beforeVersion = pair[0]
    const afterVersion = pair[1]
    const caseTitle = `${testId} (${pairTag(pair)})`
    jestTest(caseTitle, async () => {
      const { diffs, merged } = await compareFilesWithMerge(suiteId, testId, TEST_SPEC_TYPE_OPEN_API, pair)
      await fn({
        suiteId,
        testId,
        beforeVersion,
        afterVersion,
        diffs,
        merged,
      })
    })
  }
}

const TEST_DEFAULTS_ORIGINS: OriginLeafs = [{ parent: undefined, value: 'test-cs-defaults' }]

const TEST_NORMALIZE_OPTIONS: CompareOptions = {
  validate: true,
  liftCombiners: true,
  syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
  originsFlag: TEST_ORIGINS_FLAG,
  metaKey: TEST_DIFF_FLAG,
  unify: true,
  allowNotValidSyntheticChanges: true,
  createOriginsForDefaults: () => TEST_DEFAULTS_ORIGINS,
}

export const TEST_DEFAULTS_DECLARATION_PATHS = [[TEST_DEFAULTS_ORIGINS[0].value]]

/**
 * Compares before/after samples from a compatibility suite case.
 * @param suiteId - Suite identifier (e.g., 'parameters-schema')
 * @param testId - Test case identifier (e.g., 'add-union-type')
 * @param type - Spec type (defaults to OpenAPI)
 * @param specificationVersionPair - Optional specification version pair for multi-pair cases (OpenAPI only)
 * @returns Array of diffs
 */
export async function compareFiles(
  suiteId: string,
  testId: string,
  type: TestSpecType = TEST_SPEC_TYPE_OPEN_API,
  specificationVersionPair?: SpecificationVersionPair,
): Promise<Array<Diff>> {
  const result = await compareFilesWithMerge(suiteId, testId, type, specificationVersionPair)
  return result.diffs
}

/**
 * Compares before/after samples and returns full result with merge info.
 * @param suiteId - Suite identifier (e.g., 'parameters-schema')
 * @param testId - Test case identifier (e.g., 'add-union-type')
 * @param type - Spec type (defaults to OpenAPI)
 * @param specificationVersionPair - Optional specification version pair for multi-pair cases (OpenAPI only)
 * @returns Full compare result including diffs and merge info
 */
export async function compareFilesWithMerge(
  suiteId: string,
  testId: string,
  type: TestSpecType = TEST_SPEC_TYPE_OPEN_API,
  specificationVersionPair?: SpecificationVersionPair,
): Promise<CompareResult> {
  const [before, after] = getCompatibilitySuite(type, suiteId, testId, specificationVersionPair)

  let beforeObject: object
  let afterObject: object

  switch (type) {
    case TEST_SPEC_TYPE_OPEN_API: {
      beforeObject = loadYaml(before) as object
      afterObject = loadYaml(after) as object
      break
    }
    case TEST_SPEC_TYPE_GRAPH_QL: {
      const beforeSchema = buildSchema(before, { noLocation: true })
      const afterSchema = buildSchema(after, { noLocation: true })
      beforeObject = buildFromSchema(beforeSchema)
      afterObject = buildFromSchema(afterSchema)
      break
    }
  }
  const beforeSchemaWithoutComponents = removeComponents(beforeObject)
  const afterSchemaWithoutComponents = removeComponents(afterObject)
  return apiDiff(
    beforeSchemaWithoutComponents,
    afterSchemaWithoutComponents,
    {
      ...TEST_NORMALIZE_OPTIONS,
      beforeSource: beforeObject,
      afterSource: afterObject,
    },
  )
}

/**
 * Removes components from a spec object (copy-pasted from UI).
 * Keeps only directives with runtime locations and securitySchemes.
 */
function removeComponents(source: object | undefined): unknown {
  if (source && 'components' in source) {
    const { components, ...rest } = source
    if (isObject(components)) {
      if ('directives' in components && isObject(components.directives)) {
        return {
          ...rest,
          components: {
            // temp solution until "Support runtime directives" was done
            directives: Object.fromEntries(
              Object.entries(components.directives as Record<string, GraphApiDirectiveDefinition>)
                .filter(([_, directive]) =>
                  directive.locations.some(location => RUNTIME_DIRECTIVE_LOCATIONS.has(location))
                ),
            ),
          },
        }
      }
      if ('securitySchemes' in components) {
        return {
          ...rest,
          components: {
            securitySchemes: components.securitySchemes,
          },
        }
      }
    }
    return rest
  }
  return source
}
