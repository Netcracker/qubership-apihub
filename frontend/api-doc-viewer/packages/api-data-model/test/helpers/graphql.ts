import fs from 'fs'
import path from 'path'

import { aggregateDiffsWithRollup, apiDiff } from '@netcracker/qubership-apihub-api-diff'
import { denormalize, normalize, NormalizeOptions } from '@netcracker/qubership-apihub-api-unifier'
import { buildFromSchema, GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'
import { buildSchema } from 'graphql'
import { DiffMetaKeys } from '../../src'
import { createGraphApiDiffTree } from '../../src/graph-api/diff-tree/build'
import { createGraphApiTree } from '../../src/graph-api/tree/build'

export const buildGraphApiSchema = (filename: string): GraphApiSchema => {
  const resPath = path.join(__dirname, '../resources/', filename)
  const raw = fs.readFileSync(resPath, 'utf8')
  const schema = buildSchema(raw, { noLocation: true })
  return buildFromSchema(schema)
}

export function buildGraphApi(graphql: string): GraphApiSchema {
  return buildFromSchema(
    buildSchema(graphql, { noLocation: true })
  )
}

export function graphapi(strings: TemplateStringsArray): GraphApiSchema {
  return buildGraphApi(strings[0])
}

export function createGraphApiTreeForTests(source: unknown, depth?: number) {
  const options: NormalizeOptions = {
    validate: true,
    unify: true,
  }
  const normalizedSchema = normalize(source, options)
  const mergedSource = denormalize(normalizedSchema, options)
  return createGraphApiTree(mergedSource, depth)
}

export const diffsMetaKey = Symbol('diff')
export const aggregatedDiffsMetaKey = Symbol('aggregatedDiff')
export const diffMetaKeys: DiffMetaKeys = {
  diffsMetaKey: diffsMetaKey,
  aggregatedDiffsMetaKey: aggregatedDiffsMetaKey
}

export function createGraphApiDiffTreeForTests(
  before: unknown,
  after: unknown,
  metaKeys: DiffMetaKeys,
  depth?: number,
  beforeSource: unknown = before,
  afterSource: unknown = after,
) {
  const { diffsMetaKey, aggregatedDiffsMetaKey } = metaKeys

  const mergedSource = apiDiff(before, after, {
    beforeSource,
    afterSource,
    metaKey: diffsMetaKey,
    unify: true,
  }).merged

  aggregateDiffsWithRollup(mergedSource, diffsMetaKey, aggregatedDiffsMetaKey)

  return createGraphApiDiffTree(
    mergedSource,
    {
      diffsMetaKey: diffsMetaKey,
      aggregatedDiffsMetaKey: aggregatedDiffsMetaKey,
    },
    undefined,
    depth,
  )
}
