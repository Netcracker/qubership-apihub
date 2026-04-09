import { loadYaml, OriginLeafs } from '@netcracker/qubership-apihub-api-unifier'
import {
  getCompatibilitySuite,
  getCompatibilitySuiteSpecificationVersionPairs,
  SpecificationVersionPair,
  TEST_SPEC_TYPE_ASYNC_API,
  TEST_SPEC_TYPE_GRAPH_QL,
  TEST_SPEC_TYPE_OPEN_API,
  TestSpecType,
} from '@netcracker/qubership-apihub-compatibility-suites'
import { buildFromSchema, GraphApiDirectiveDefinition } from '@netcracker/qubership-apihub-graphapi'
import { isObject } from '@netcracker/qubership-apihub-json-crawl'
import { buildSchema } from 'graphql/utilities'
import { apiDiff, CompareOptions, CompareResult, Diff, DiffType } from '../../src'
import { RUNTIME_DIRECTIVE_LOCATIONS } from '../../src/graphapi'
import { TEST_DIFF_FLAG, TEST_ORIGINS_FLAG, TEST_SYNTHETIC_TITLE_FLAG } from '../helper'

export const DATA_FLOW_DIRECTION_SEND = 'send' as const
export const DATA_FLOW_DIRECTION_RECEIVE = 'receive' as const

export type DataFlowDirection = typeof DATA_FLOW_DIRECTION_SEND | typeof DATA_FLOW_DIRECTION_RECEIVE

/**
 * Returns a selector that picks the expected diff type based on direction.
 * First argument is for request, second is for response.
 */
export function createExpectedDiffTypeSelector(direction: DataFlowDirection) {
  return (forSend: DiffType, forReceive: DiffType): DiffType => {
    return direction === DATA_FLOW_DIRECTION_SEND ? forSend : forReceive
  }
}

/**
 * Extracts test ID from the current Jest test name.
 * In Jest 30, `currentTestName` joins describe/test names with a space.
 * Since all test names in our suites are kebab-case (no spaces), the last word is the test ID.
 */
export const currentTestId = (): string => {
  const fullName = expect.getState().currentTestName!
  return fullName.split(' ').pop()!
}

const toMajorMinor = (v: string): string => {
  const match = v.match(/^(\d+\.\d+)/)
  return match ? match[1] : v
}

const pairTag = (pair: SpecificationVersionPair): string => `${toMajorMinor(pair[0])}-${toMajorMinor(pair[1])}`

type SpecVersionPairCaseContext = {
  suiteType: TestSpecType
  suiteId: string
  testId: string
  beforeVersion: string
  afterVersion: string
  diffs: Array<Diff>
  merged: unknown
}

/**
 * Initializes custom Jest wrapper `caseForSpecVersionPairs` on `test`/`it` and their `.only`/`.skip` variants.
 *
 * Why:
 * - **Runtime**: makes calls like `test.caseForSpecVersionPairs(...)` actually exist (they call into our generator).
 * - **IDE/Test Explorer**: many Jest integrations recognize only expressions starting with `test`/`it`, so
 *   `test.caseForSpecVersionPairs(...)` is easier for them to detect than a standalone helper call.
 *
 * Call this once from Jest `setupFilesAfterEnv` (see `test/setup/jest-wrappers.ts`).
 */
export function initCaseForSpecVersionPairs(): void {
  const attach = (jestIt: typeof test): void => {
    const record = jestIt as unknown as Record<string, unknown>

    record.caseForSpecVersionPairs = (
      suiteType: TestSpecType,
      testId: string,
      suiteId: string,
      fn: (ctx: SpecVersionPairCaseContext) => Promise<void> | void,
    ): void => {
      runCaseForSpecVersionPairs(jestIt, suiteType, testId, suiteId, fn)
    }
  }

  attach(test)
  attach(test.only)
  attach(test.skip)

  attach(it)
  attach(it.only)
  attach(it.skip)
}

function runCaseForSpecVersionPairs(
  jestTest: typeof test,
  suiteType: TestSpecType,
  testId: string,
  suiteId: string,
  fn: (ctx: SpecVersionPairCaseContext) => Promise<void> | void,
): void {
  const pairs = getCompatibilitySuiteSpecificationVersionPairs(suiteType, suiteId, testId)

  if (pairs.length === 0) {
    jestTest(`${testId} (no version pairs)`, () => {
      throw new Error(`No version pairs for (${suiteType}, ${suiteId}, ${testId})`)
    })
    return
  }

  for (const pair of pairs) {
    const beforeVersion = pair[0]
    const afterVersion = pair[1]
    const caseTitle = `${testId} (${pairTag(pair)})`
    jestTest(caseTitle, async () => {
      const { diffs, merged } = await compareFilesWithMerge(suiteId, testId, suiteType, pair)
      await fn({
        suiteType,
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
    case TEST_SPEC_TYPE_ASYNC_API: {
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
    default: {
      throw new Error(`Unsupported spec type for comparison: ${type}`)
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
