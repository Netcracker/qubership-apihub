import fs from 'fs'
import path from 'path'

import { denormalize, normalize, NormalizeOptions } from '@netcracker/qubership-apihub-api-unifier'
import { apiDiff } from '@netcracker/qubership-apihub-api-diff'
import { buildFromSchema, GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'
import { buildSchema } from 'graphql'
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

export function createGraphApiTreeForTests(source: unknown) {
  const options: NormalizeOptions = {
    validate: true,
    unify: true,
  }
  const normalizedSchema = normalize(source, options)
  const mergedSource = denormalize(normalizedSchema, options)
  return createGraphApiTree(mergedSource)
}

export const metaKey = Symbol('diff')

export function createGraphApiDiffTreeForTests(
  before: unknown,
  after: unknown,
  metaKey: symbol,
  beforeSource: unknown = before,
  afterSource: unknown = after,
) {
  const mergedSource = apiDiff(before, after, {
    beforeSource,
    afterSource,
    metaKey,
    unify: true,
  }).merged
  return createGraphApiDiffTree(mergedSource, metaKey)
}
