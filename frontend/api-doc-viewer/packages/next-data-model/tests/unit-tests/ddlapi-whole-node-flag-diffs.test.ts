import { readFileSync } from 'fs'
import { join } from 'path'
import {
  isDdlFlagBadgeDiffHighlighted,
  takeColumnFlagDiffs,
  takeIndexFlagDiffs,
} from '@apihub/next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs'
import { buildFromDdl } from '@netcracker/qubership-apihub-ddlapi/parser'
import { apiDiff, DiffAction } from '@netcracker/qubership-apihub-api-diff'
import { DdlApiTreeWithDiffsBuilder } from '../../src/building-service/ddlapi/tree-with-diffs/builder'
import { DdlApiTreeNodeKinds } from '../../src/model/ddlapi/types/node-kind'

const TEST_DIFFS_META_KEY = Symbol('test-ddl-diffs-meta-key')
const TEST_AGGREGATED_DIFFS_META_KEY = Symbol('test-ddl-aggregated-diffs-meta-key')
const TEST_DIFF_META_KEYS = {
  diffsMetaKey: TEST_DIFFS_META_KEY,
  aggregatedDiffsMetaKey: TEST_AGGREGATED_DIFFS_META_KEY,
}

async function buildTree(caseId: string) {
  const base = join(__dirname, '../../../samples/ddlapi-diffs/column-changes-except-types', caseId)
  const beforeSql = readFileSync(join(base, 'before.sql'), 'utf8')
  const afterSql = readFileSync(join(base, 'after.sql'), 'utf8')
  const before = await buildFromDdl(beforeSql)
  const after = await buildFromDdl(afterSql)
  const merged = apiDiff(before, after, {
    metaKey: TEST_DIFFS_META_KEY,
    normalizedResult: false,
  }).merged

  return new DdlApiTreeWithDiffsBuilder({
    source: merged,
    tableKey: { schemaName: 'public', name: 't' },
    diffsMetaKeys: TEST_DIFF_META_KEYS,
  }).build()
}

function findColumn(tree: ReturnType<DdlApiTreeWithDiffsBuilder['build']>, key: string) {
  return Array.from(tree.nodes.values()).find(
    node => node.kind === DdlApiTreeNodeKinds.COLUMN && node.key === key,
  )
}

function findUniqueIndex(tree: ReturnType<DdlApiTreeWithDiffsBuilder['build']>, partName: string) {
  return Array.from(tree.nodes.values()).find(
    node => node.kind === DdlApiTreeNodeKinds.INDEX
      && node.value()?.partNames.includes(partName)
      && node.value()?.isUnique,
  )
}

describe('whole-node unique flag diffs', () => {
  it('case 203: unique badge is side-visible on changed only and not diff-highlighted', async () => {
    const tree = await buildTree('203-add-column-unique')
    const codeColumn = findColumn(tree, 'code')

    expect(codeColumn?.value()?.isUnique).toBe(true)

    const flagDiffs = takeColumnFlagDiffs(codeColumn!)
    expect(flagDiffs?.isUnique?.data.action).toBe(DiffAction.add)
    expect(flagDiffs?.isUnique?.styles.before.isContentVisible).toBe(false)
    expect(flagDiffs?.isUnique?.styles.after.isContentVisible).toBe(true)
    expect(isDdlFlagBadgeDiffHighlighted(flagDiffs?.isUnique)).toBe(false)
  })

  it('case 303: unique badge is side-visible on origin only and not diff-highlighted', async () => {
    const tree = await buildTree('303-remove-column-unique')
    const codeColumn = findColumn(tree, 'code')

    expect(codeColumn?.value()?.isUnique).toBe(true)

    const flagDiffs = takeColumnFlagDiffs(codeColumn!)
    expect(flagDiffs?.isUnique?.data.action).toBe(DiffAction.remove)
    expect(flagDiffs?.isUnique?.styles.before.isContentVisible).toBe(true)
    expect(flagDiffs?.isUnique?.styles.after.isContentVisible).toBe(false)
    expect(isDdlFlagBadgeDiffHighlighted(flagDiffs?.isUnique)).toBe(false)
  })

  it('case 403: column unique badge stays diff-highlighted; index unique badge is side-only', async () => {
    const tree = await buildTree('403-existing-column-became-unique')
    const codeColumn = findColumn(tree, 'code')
    const uniqueIndex = findUniqueIndex(tree, 'code')

    const columnFlagDiffs = takeColumnFlagDiffs(codeColumn!)
    expect(isDdlFlagBadgeDiffHighlighted(columnFlagDiffs?.isUnique)).toBe(true)

    const indexFlagDiffs = takeIndexFlagDiffs(uniqueIndex!)
    expect(indexFlagDiffs?.isUnique?.data.action).toBe(DiffAction.add)
    expect(indexFlagDiffs?.isUnique?.styles.before.isContentVisible).toBe(false)
    expect(indexFlagDiffs?.isUnique?.styles.after.isContentVisible).toBe(true)
    expect(isDdlFlagBadgeDiffHighlighted(indexFlagDiffs?.isUnique)).toBe(false)
  })

  it('case 503: column unique badge stays diff-highlighted; index unique badge is side-only', async () => {
    const tree = await buildTree('503-existing-column-lost-unique')
    const codeColumn = findColumn(tree, 'code')
    const uniqueIndex = findUniqueIndex(tree, 'code')

    const columnFlagDiffs = takeColumnFlagDiffs(codeColumn!)
    expect(isDdlFlagBadgeDiffHighlighted(columnFlagDiffs?.isUnique)).toBe(true)

    const indexFlagDiffs = takeIndexFlagDiffs(uniqueIndex!)
    expect(indexFlagDiffs?.isUnique?.data.action).toBe(DiffAction.remove)
    expect(indexFlagDiffs?.isUnique?.styles.before.isContentVisible).toBe(true)
    expect(indexFlagDiffs?.isUnique?.styles.after.isContentVisible).toBe(false)
    expect(isDdlFlagBadgeDiffHighlighted(indexFlagDiffs?.isUnique)).toBe(false)
  })
})
