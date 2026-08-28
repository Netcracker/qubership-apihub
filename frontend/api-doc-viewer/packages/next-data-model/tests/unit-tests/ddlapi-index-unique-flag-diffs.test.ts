import { readFileSync } from 'fs'
import { join } from 'path'
import { HighlightVariant } from '@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface'
import { DDL_PROPERTY_TITLE_ROW_DIFF_KEY } from '@apihub/next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs.types'
import {
  isDdlFlagBadgeDiffHighlighted,
  takeColumnFlagDiffs,
  takeIndexFlagDiffs,
} from '@apihub/next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs'
import { buildFromDdl } from '@netcracker/qubership-apihub-ddlapi/parser'
import { apiDiff, DiffAction } from '@netcracker/qubership-apihub-api-diff'
import { DdlApiSpecWithDiffsTransformer } from '../../src/building-service/ddlapi/shared/ddlapi-spec-with-diffs-transformer'
import { DdlApiTreeWithDiffsBuilder } from '../../src/building-service/ddlapi/tree-with-diffs/builder'
import { DdlApiTreeNodeKinds } from '../../src/model/ddlapi/types/node-kind'
import { createBuildingServiceLogger } from '../../src/loggers'

const TEST_DIFFS_META_KEY = Symbol('test-ddl-diffs-meta-key')
const TEST_AGGREGATED_DIFFS_META_KEY = Symbol('test-ddl-aggregated-diffs-meta-key')
const TEST_DIFF_META_KEYS = {
  diffsMetaKey: TEST_DIFFS_META_KEY,
  aggregatedDiffsMetaKey: TEST_AGGREGATED_DIFFS_META_KEY,
}

async function buildTree(caseId: string) {
  const base = join(__dirname, '../../../samples/ddlapi-diffs/index-changes', caseId)
  const before = await buildFromDdl(readFileSync(join(base, 'before.sql'), 'utf8'))
  const after = await buildFromDdl(readFileSync(join(base, 'after.sql'), 'utf8'))
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

function findNode(
  tree: ReturnType<DdlApiTreeWithDiffsBuilder['build']>,
  kind: typeof DdlApiTreeNodeKinds.COLUMN | typeof DdlApiTreeNodeKinds.INDEX,
  key: string,
) {
  return Array.from(tree.nodes.values()).find(node => node.kind === kind && node.key === key)!
}

describe('index unique toggle badge contract (cases 12/13)', () => {
  it.each([
    ['12-index-became-unique', DiffAction.add, false, true],
    ['13-index-lost-unique', DiffAction.remove, true, false],
  ])(
    'case %s: index row unique badge side visibility and title-row replace',
    async (caseId, expectedAction, visibleBefore, visibleAfter) => {
      const tree = await buildTree(caseId)
      const index = findNode(tree, DdlApiTreeNodeKinds.INDEX, 'idx_t_c1')
      const flagDiffs = takeIndexFlagDiffs(index)

      expect(flagDiffs?.isUnique?.data.action).toBe(expectedAction)
      expect(flagDiffs?.isUnique?.styles.before.isContentVisible).toBe(visibleBefore)
      expect(flagDiffs?.isUnique?.styles.after.isContentVisible).toBe(visibleAfter)
      expect(isDdlFlagBadgeDiffHighlighted(flagDiffs?.isUnique)).toBe(true)

      const titleRowDiff = index.diffs[DDL_PROPERTY_TITLE_ROW_DIFF_KEY]
      expect(titleRowDiff?.data.action).toBe(DiffAction.replace)
      expect(titleRowDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Yellow)
      expect(titleRowDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Yellow)
    },
  )

  it.each([
    ['12-index-became-unique', DiffAction.add, false, true],
    ['13-index-lost-unique', DiffAction.remove, true, false],
  ])(
    'case %s: column row mirrors index unique badge when index unique toggles',
    async (caseId, expectedAction, visibleBefore, visibleAfter) => {
      const tree = await buildTree(caseId)
      const column = findNode(tree, DdlApiTreeNodeKinds.COLUMN, 'c1')
      const flagDiffs = takeColumnFlagDiffs(column)

      expect(flagDiffs?.isUnique?.data.action).toBe(expectedAction)
      expect(flagDiffs?.isUnique?.styles.before.isContentVisible).toBe(visibleBefore)
      expect(flagDiffs?.isUnique?.styles.after.isContentVisible).toBe(visibleAfter)
      expect(isDdlFlagBadgeDiffHighlighted(flagDiffs?.isUnique)).toBe(true)

      const titleRowDiff = column.diffs[DDL_PROPERTY_TITLE_ROW_DIFF_KEY]
      expect(titleRowDiff?.data.action).toBe(DiffAction.replace)
      expect(titleRowDiff?.styles.before.backgroundColor).toBe(HighlightVariant.Yellow)
      expect(titleRowDiff?.styles.after.backgroundColor).toBe(HighlightVariant.Yellow)
    },
  )

  it('does not attach column isUnique when a non-unique single-column index is added', async () => {
    const merged = await (async () => {
      const before = await buildFromDdl('create table public.t(c1 int);')
      const after = await buildFromDdl('create table public.t(c1 int); create index idx_t_c1 on public.t(c1);')
      return apiDiff(before, after, { metaKey: TEST_DIFFS_META_KEY, normalizedResult: false }).merged
    })()
    const transformer = new DdlApiSpecWithDiffsTransformer(
      createBuildingServiceLogger(),
      TEST_DIFF_META_KEYS,
    )
    const spec = transformer.transformSourceToTableOrientedSpecWithDiffs(merged, {
      schemaName: 'public',
      name: 't',
    })
    const columnDiffs = spec?.columns.items.find(column => column.columnName === 'c1')?.[TEST_DIFFS_META_KEY] as
      | Record<string, unknown>
      | undefined

    expect(columnDiffs?.isUnique).toBeUndefined()
  })
})
