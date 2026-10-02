import { NodeDiffsSeverityPlacemennt } from '@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface'
import { takeColumnFlagDiffs } from '@apihub/next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs'
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

const SINGLE_COLUMN_KEY = `
  create table public.users (
    id int,
    tenant_id int,
    constraint pk_users primary key (id)
  );
`
const TWO_COLUMN_KEY = `
  create table public.users (
    id int,
    tenant_id int,
    constraint pk_users primary key (id, tenant_id)
  );
`
const PRIMARY_KEY_PART_PATH = ['schemas', 0, 'tables', 0, 'primaryKey', 'parts', 1]

async function buildTree(beforeSql: string, afterSql: string) {
  const before = await buildFromDdl(beforeSql)
  const after = await buildFromDdl(afterSql)
  const merged = apiDiff(before, after, {
    metaKey: TEST_DIFFS_META_KEY,
    normalizedResult: false,
  }).merged

  return new DdlApiTreeWithDiffsBuilder({
    source: merged,
    tableKey: { schemaName: 'public', name: 'users' },
    diffsMetaKeys: TEST_DIFF_META_KEYS,
  }).build()
}

function findColumn(tree: ReturnType<DdlApiTreeWithDiffsBuilder['build']>, key: string) {
  return Array.from(tree.nodes.values()).find(node => node.kind === DdlApiTreeNodeKinds.COLUMN && node.key === key)!
}

// A column that joins or leaves an existing primary key is a part add or remove under
// `primaryKey.parts`. The column row takes it as its primary key flag diff, so the title-row
// tooltip names the key part rather than the nullability default that changes with it.
describe('primary key flag diff when a column joins or leaves the key', () => {
  it.each([
    ['joins', SINGLE_COLUMN_KEY, TWO_COLUMN_KEY, DiffAction.add],
    ['leaves', TWO_COLUMN_KEY, SINGLE_COLUMN_KEY, DiffAction.remove],
  ])('column %s the primary key', async (_, beforeSql, afterSql, expectedAction) => {
    const tree = await buildTree(beforeSql, afterSql)
    const tenantId = findColumn(tree, 'tenant_id')

    expect(takeColumnFlagDiffs(tenantId)?.isPrimaryKey?.data.action).toBe(expectedAction)
    expect(tenantId.diffsSeverities?.[NodeDiffsSeverityPlacemennt.TitleRow]?.causedAt).toEqual(PRIMARY_KEY_PART_PATH)
    expect(takeColumnFlagDiffs(findColumn(tree, 'id'))?.isPrimaryKey).toBeUndefined()
  })
})
