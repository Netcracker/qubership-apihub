import { TEST_DIFF_FLAG, TEST_SYNTHETIC_TITLE_FLAG } from './helper'
import { CompareOptions } from '../src/types'
import { apiDiff } from '../src'
import { buildSchema } from 'graphql'
import { buildFromSchema } from '@netcracker/qubership-apihub-graphapi'
import { readFileSync } from 'fs'
import { load } from 'js-yaml'

const OPTIONS = {
  unify: true,
  validate: true,
  liftCombiners: true,
  syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
  metaKey: TEST_DIFF_FLAG,
} satisfies CompareOptions

function splitSourceToComponents(source: any) {
  const { components, ...rest } = source
  return rest
}

export function qgl() {
  const beforeSource = buildFromSchema(buildSchema(readFileSync('./test/helper/resources/graphql/before.graphql').toString(), { noLocation: true }))
  const afterSource = buildFromSchema(buildSchema(readFileSync('./test/helper/resources/graphql/after.graphql').toString(), { noLocation: true }))
  const before: unknown = splitSourceToComponents(beforeSource)
  const after: unknown = splitSourceToComponents(afterSource)
  const { diffs } = apiDiff(before, after, {
      ...OPTIONS,
      beforeSource,
      afterSource,
    },
  )
  return diffs.length
}

export function oas30() {
  const beforeSource = load(readFileSync('./test/helper/resources/openapi/30/before.yaml').toString())
  const afterSource = load(readFileSync('./test/helper/resources/openapi/30/after.yaml').toString())
  const before: unknown = splitSourceToComponents(beforeSource)
  const after: unknown = splitSourceToComponents(afterSource)
  const { diffs } = apiDiff(before, after,
    {
      ...OPTIONS,
      beforeSource,
      afterSource,
    },
  )
  return diffs.length
}
