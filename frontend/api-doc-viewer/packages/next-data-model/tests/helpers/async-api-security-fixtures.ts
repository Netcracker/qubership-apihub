import { apiDiff } from '@netcracker/qubership-apihub-api-diff'
import { denormalize, normalize, NormalizeOptions } from '@netcracker/qubership-apihub-api-unifier'
import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import { join } from 'path'
import { DiffMetaKeys } from '../../src/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys'
import { AsyncApiTreeWithDiffsBuilder } from '../../src/building-service/async-api/tree-with-diffs/builder'
import { AsyncApiTreeBuilder } from '../../src/building-service/async-api/tree/builder'
import { AsyncApiTree } from '../../src/model/async-api/tree/tree.impl'
import { AsyncApiTreeWithDiffs } from '../../src/model/async-api/tree-with-diffs/tree.impl'

const SAMPLES_ROOT = join(__dirname, '..', '..', '..', 'samples')

/** The reference-name symbol the stories pass (`firstReferenceKeyProperty`). */
export const ASYNC_API_TEST_REFERENCE_NAME = Symbol('async-api-test-reference-name')

export const ASYNC_API_TEST_DIFF_META_KEYS: DiffMetaKeys = {
  diffsMetaKey: Symbol('async-api-test-diffs'),
  aggregatedDiffsMetaKey: Symbol('async-api-test-aggregated-diffs'),
}

const syntheticTitleFlag = Symbol('syntheticTitle')

const NORMALIZE_OPTIONS: NormalizeOptions = {
  syntheticTitleFlag,
  firstReferenceKeyProperty: ASYNC_API_TEST_REFERENCE_NAME,
  unify: true,
  validate: true,
  liftCombiners: true,
}

const OPERATION_KEYS = { operationKey: 'sendOperation', messageKey: 'TestMessage' }

function loadYaml(relativePath: string): unknown {
  return load(readFileSync(join(SAMPLES_ROOT, relativePath), 'utf8'))
}

/** Plain fixture `packages/samples/async-api/security/<caseId>/document.yaml`, normalized like the stories do. */
export function buildAsyncApiSecurityTree(caseId: string): AsyncApiTree {
  const source = loadYaml(join('async-api', 'security', caseId, 'document.yaml'))
  const merged = denormalize(normalize(source, NORMALIZE_OPTIONS), NORMALIZE_OPTIONS)
  return new AsyncApiTreeBuilder({ source: merged, referenceNamePropertyKey: ASYNC_API_TEST_REFERENCE_NAME, operationKeys: OPERATION_KEYS }).build()
}

/** Diff fixture `packages/samples/async-api-diffs/security/<caseId>/{before,after}.yaml`, merged like the stories do. */
export function buildAsyncApiSecurityTreeWithDiffs(caseId: string): AsyncApiTreeWithDiffs {
  const before = loadYaml(join('async-api-diffs', 'security', caseId, 'before.yaml'))
  const after = loadYaml(join('async-api-diffs', 'security', caseId, 'after.yaml'))
  const merged = apiDiff(before, after, {
    ...NORMALIZE_OPTIONS,
    beforeSource: before,
    afterSource: after,
    metaKey: ASYNC_API_TEST_DIFF_META_KEYS.diffsMetaKey,
  }).merged
  return new AsyncApiTreeWithDiffsBuilder({
    source: merged,
    referenceNamePropertyKey: ASYNC_API_TEST_REFERENCE_NAME,
    diffsMetaKeys: ASYNC_API_TEST_DIFF_META_KEYS,
    operationKeys: OPERATION_KEYS,
  }).build()
}
