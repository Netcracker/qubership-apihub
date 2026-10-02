import { CHANGED_LAYOUT_SIDE, ORIGIN_LAYOUT_SIDE } from '@apihub/next-data-model/model/abstract/layout-side'
import { HighlightVariant, NodeDiffsSeverityPlacemennt } from '@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface'
import {
  formatForeignKeyTargetKey,
  formatForeignKeyTargetKeys,
  resolveForeignKeyTargetSideDisplay,
} from '@apihub/next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs'
import { DdlApiForeignKeyTarget } from '@apihub/next-data-model/model/ddlapi/tree/node-value'
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

async function buildTree(beforeSql: string, afterSql: string, tableName: string) {
  const before = await buildFromDdl(beforeSql)
  const after = await buildFromDdl(afterSql)
  const merged = apiDiff(before, after, {
    metaKey: TEST_DIFFS_META_KEY,
    normalizedResult: false,
  }).merged

  return new DdlApiTreeWithDiffsBuilder({
    source: merged,
    tableKey: { schemaName: 'public', name: tableName },
    diffsMetaKeys: TEST_DIFF_META_KEYS,
  }).build()
}

function findColumn(tree: ReturnType<DdlApiTreeWithDiffsBuilder['build']>, key: string) {
  return Array.from(tree.nodes.values()).find(node => node.kind === DdlApiTreeNodeKinds.COLUMN && node.key === key)!
}

const target = (tableName: string, columnName: string): DdlApiForeignKeyTarget => ({
  schemaName: 'public',
  tableName,
  columnName,
})

// A foreign key that exists on both sides but changes in place. A column that keeps the key shows
// one changed target; a column that the key stops or starts covering shows it removed or added.
describe('foreign key target diffs when a key changes in place', () => {
  it('change-foreign-key-columns: the column that leaves the key loses its target, the one that joins gains it', async () => {
    const tree = await buildTree(
      `create table parent (id int primary key);
       create table child (a int, b int, constraint fk_child_parent foreign key (a) references parent (id));`,
      `create table parent (id int primary key);
       create table child (a int, b int, constraint fk_child_parent foreign key (b) references parent (id));`,
      'child',
    )
    const parentId = target('parent', 'id')

    for (const [columnName, action] of [['a', DiffAction.remove], ['b', DiffAction.add]] as const) {
      const column = findColumn(tree, columnName)
      const targetDiff = column.diffs.foreignKeyTargetDiffs?.[formatForeignKeyTargetKey(parentId)]

      // The merged document holds the after values, so the removed target is added to the row.
      expect(column.value()?.foreignKeyTargets).toEqual([parentId])
      expect(targetDiff?.data.action).toBe(action)
      expect(targetDiff?.styles.before.isContentVisible).toBe(action === DiffAction.remove)
      expect(targetDiff?.styles.after.isContentVisible).toBe(action === DiffAction.add)
      expect(column.diffsSeverities?.[NodeDiffsSeverityPlacemennt.TitleRow]?.causedAt?.at(-1)).toBe('columns')
    }
  })

  it.each([
    [
      'change-referenced-columns',
      `create table t (id int unique, code int unique);
       create table u (ref int, constraint fk_u_t foreign key (ref) references t (id));`,
      `create table t (id int unique, code int unique);
       create table u (ref int, constraint fk_u_t foreign key (ref) references t (code));`,
      target('t', 'id'),
      target('t', 'code'),
      'refColumns',
    ],
    [
      'change-referenced-table',
      `create table legacy (id int primary key);
       create table target (id int primary key);
       create table u (ref int, constraint fk_u_ref foreign key (ref) references legacy (id));`,
      `create table legacy (id int primary key);
       create table target (id int primary key);
       create table u (ref int, constraint fk_u_ref foreign key (ref) references target (id));`,
      target('legacy', 'id'),
      target('target', 'id'),
      'refTable',
    ],
  ])('%s: the column keeps its key and shows one changed target', async (_, beforeSql, afterSql, beforeTarget, afterTarget, causedAt) => {
    const tree = await buildTree(beforeSql, afterSql, 'u')
    const column = findColumn(tree, 'ref')
    const targetDiff = column.diffs.foreignKeyTargetDiffs?.[formatForeignKeyTargetKey(afterTarget)]

    expect(column.value()?.foreignKeyTargets).toEqual([afterTarget])
    expect(Object.keys(column.diffs.foreignKeyTargetDiffs ?? {})).toHaveLength(1)
    expect(targetDiff?.data.action).toBe(DiffAction.replace)
    expect(targetDiff?.styles.before).toMatchObject({ isContentVisible: true, textHighlighterColor: HighlightVariant.Yellow })
    expect(targetDiff?.styles.after).toMatchObject({ isContentVisible: true, textHighlighterColor: HighlightVariant.Yellow })
    expect(resolveForeignKeyTargetSideDisplay(afterTarget, targetDiff, ORIGIN_LAYOUT_SIDE)).toEqual(beforeTarget)
    expect(resolveForeignKeyTargetSideDisplay(afterTarget, targetDiff, CHANGED_LAYOUT_SIDE)).toEqual(afterTarget)
    expect(column.diffsSeverities?.[NodeDiffsSeverityPlacemennt.TitleRow]?.causedAt?.at(-1)).toBe(causedAt)
  })
})

// Two foreign keys of one column can show the same target. Each badge carries the diff of its own
// key, so a removed key shows on the before side only and an added key on the after side only.
describe('foreign key target diffs when two keys of a column show the same target', () => {
  const parentId = target('parent', 'id')

  function targetDiffActions(column: ReturnType<typeof findColumn>): Array<string | undefined> {
    const targets = column.value()?.foreignKeyTargets ?? []
    return formatForeignKeyTargetKeys(targets).map(key => column.diffs.foreignKeyTargetDiffs?.[key]?.data.action)
  }

  it('renamed key: the old key is removed and the new one added, one per side', async () => {
    const tree = await buildTree(
      `create table parent (id int primary key);
       create table child (a int, constraint fk_old foreign key (a) references parent (id));`,
      `create table parent (id int primary key);
       create table child (a int, constraint fk_new foreign key (a) references parent (id));`,
      'child',
    )
    const column = findColumn(tree, 'a')
    const keys = formatForeignKeyTargetKeys(column.value()?.foreignKeyTargets ?? [])
    const [removed, added] = keys.map(key => column.diffs.foreignKeyTargetDiffs?.[key])

    // The merged document keeps the removed key in its place and appends the added one.
    expect(column.value()?.foreignKeyTargets).toEqual([parentId, parentId])
    expect(targetDiffActions(column)).toEqual([DiffAction.remove, DiffAction.add])
    expect(removed?.styles.before.isContentVisible).toBe(true)
    expect(removed?.styles.after.isContentVisible).toBe(false)
    expect(added?.styles.before.isContentVisible).toBe(false)
    expect(added?.styles.after.isContentVisible).toBe(true)
  })

  it('removed key next to an unchanged one: only the removed key is marked', async () => {
    const tree = await buildTree(
      `create table parent (id int primary key);
       create table child (
         a int,
         constraint fk_kept foreign key (a) references parent (id),
         constraint fk_gone foreign key (a) references parent (id)
       );`,
      `create table parent (id int primary key);
       create table child (a int, constraint fk_kept foreign key (a) references parent (id));`,
      'child',
    )
    const column = findColumn(tree, 'a')

    expect(column.value()?.foreignKeyTargets).toEqual([parentId, parentId])
    expect(targetDiffActions(column)).toEqual([undefined, DiffAction.remove])
  })

  it('key moved off the column next to an unchanged one: the moved key is a second, removed badge', async () => {
    const tree = await buildTree(
      `create table parent (id int primary key);
       create table child (
         a int,
         b int,
         constraint fk_kept foreign key (a) references parent (id),
         constraint fk_moved foreign key (a) references parent (id)
       );`,
      `create table parent (id int primary key);
       create table child (
         a int,
         b int,
         constraint fk_kept foreign key (a) references parent (id),
         constraint fk_moved foreign key (b) references parent (id)
       );`,
      'child',
    )
    const column = findColumn(tree, 'a')

    expect(column.value()?.foreignKeyTargets).toEqual([parentId, parentId])
    expect(targetDiffActions(column)).toEqual([undefined, DiffAction.remove])
    expect(targetDiffActions(findColumn(tree, 'b'))).toEqual([DiffAction.add])
  })
})
