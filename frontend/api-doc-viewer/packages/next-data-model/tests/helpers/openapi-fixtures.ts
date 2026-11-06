import { apiDiff, DIFF_META_KEY } from '@netcracker/qubership-apihub-api-diff'
import { denormalize, normalize, NormalizeOptions } from '@netcracker/qubership-apihub-api-unifier'
import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import { join } from 'path'
import { DiffMetaKeys } from '../../src/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys'

const SAMPLES_ROOT = join(__dirname, '..', '..', '..', 'samples')

const syntheticTitleFlag = Symbol('syntheticTitle')

const NORMALIZE_OPTIONS: NormalizeOptions = {
  syntheticTitleFlag,
  unify: true,
  validate: true,
  liftCombiners: true,
  allowNotValidSyntheticChanges: true,
}

export const OPENAPI_TEST_DIFF_META_KEYS: DiffMetaKeys = {
  diffsMetaKey: DIFF_META_KEY,
  aggregatedDiffsMetaKey: Symbol('openapi-test-aggregated-diffs'),
}

export function loadOpenApiYaml(relativePath: string): unknown {
  return load(readFileSync(join(SAMPLES_ROOT, relativePath), 'utf8'))
}

/** Plain fixture `packages/samples/openapi/<caseId>/sample.yaml`, normalized like the stories do. */
export function loadNormalizedOpenApiSample(caseId: string): unknown {
  const source = loadOpenApiYaml(join('openapi', caseId, 'sample.yaml'))
  const options = { ...NORMALIZE_OPTIONS, source }
  return denormalize(normalize(source, options), options)
}

/** Diff fixture `packages/samples/openapi-diffs/<caseId>/{before,after}.yaml`, merged like the stories do. */
export function loadMergedOpenApiSample(caseId: string): unknown {
  const before = loadOpenApiYaml(join('openapi-diffs', caseId, 'before.yaml'))
  const after = loadOpenApiYaml(join('openapi-diffs', caseId, 'after.yaml'))
  return mergeOpenApiDocuments(before, after)
}

/** Two whole OpenAPI documents merged like the stories do (programmatic cases of `@netcracker/qubership-apihub-samples`). */
export function mergeOpenApiDocuments(before: unknown, after: unknown): unknown {
  return apiDiff(before, after, {
    ...NORMALIZE_OPTIONS,
    beforeSource: before,
    afterSource: after,
    metaKey: DIFF_META_KEY,
  }).merged
}
