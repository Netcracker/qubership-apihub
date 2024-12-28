import { apiDiff, CompareOptions, CompareResult, Diff } from '../../src'
import { load } from 'js-yaml'
import {
  getCompatibilitySuite,
  TEST_SPEC_TYPE_GRAPH_QL,
  TEST_SPEC_TYPE_OPEN_API,
  TestSpecType,
} from '@netcracker/qubership-apihub-compatibility-suites'
import { buildFromSchema, GraphApiDirectiveDefinition } from '@netcracker/qubership-apihub-graphapi'
import { buildSchema } from 'graphql/utilities'
import { isArray, isObject } from '@netcracker/qubership-apihub-json-crawl'
import { TEST_DIFF_FLAG, TEST_ORIGINS_FLAG, TEST_SYNTHETIC_TITLE_FLAG } from '../helper'
import { OriginLeafs } from '@netcracker/qubership-apihub-api-unifier'
import { RUNTIME_DIRECTIVE_LOCATIONS } from '../../src/graphapi'

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

export async function compareFiles(suiteId: string, testId: string, type: TestSpecType = TEST_SPEC_TYPE_OPEN_API): Promise<Array<Diff>> {
  const result = await compareFilesWithMerge(suiteId, testId, type)
  return result.diffs
}

export async function compareFilesWithMerge(suiteId: string, testId: string, type: TestSpecType = TEST_SPEC_TYPE_OPEN_API): Promise<CompareResult> {
  const [before, after] = getCompatibilitySuite(type, suiteId, testId)

  let beforeObject: object
  let afterObject: object

  switch (type) {
    case TEST_SPEC_TYPE_OPEN_API: {
      beforeObject = load(before) as object
      afterObject = load(after) as object
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

// copy-pasted from UI
export function removeComponents(source: object | undefined): unknown {
  if (source && 'components' in source) {
    const { components, ...rest } = source
    if (isObject(components)) {
      if ('directives' in components && isObject(components.directives)) {
        return {
          ...rest,
          components: {
            //temp solution until "Support runtime directives" was done
            directives: Object.fromEntries(
              Object.entries(components.directives as Record<string, GraphApiDirectiveDefinition>)
                .filter(([_,directive]) => directive.locations.some(location => RUNTIME_DIRECTIVE_LOCATIONS.has(location)))
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

