import { readFileSync } from 'fs'
import { join } from 'path'
import {
  ChangedPropertyMetaData,
  HighlightVariant,
  NODE_LEVEL_DIFF_KEY,
} from '../../src/model/abstract/tree-with-diffs/tree-node.interface'
import { CHANGED_LAYOUT_SIDE, ORIGIN_LAYOUT_SIDE } from '../../src/model/abstract/layout-side'
import {
  DDL_PROPERTY_TITLE_ROW_DIFF_KEY,
  isDdlPropertyListSectionUniformWholeNodeChange,
  isDdlPropertyRowContentVisible,
  isDdlPropertySubheaderVisible,
} from '../../src/model/ddlapi/tree-with-diffs/property-row-diffs'
import { buildFromDdl } from '@netcracker/qubership-apihub-ddlapi/parser'
import { apiDiff, breaking, Diff, DiffAction, DiffType, nonBreaking } from '@netcracker/qubership-apihub-api-diff'
import {
  aggregateUniformWholeNodeDescendantDiff,
  buildPropertyListSectionWholeNodeChangedPropertyMetaData,
} from '../../src/building-service/ddlapi/tree-with-diffs/node-diffs-data/shared/property-list-section-diff-utils'
import { DdlApiTreeWithDiffsBuilder } from '../../src/building-service/ddlapi/tree-with-diffs/builder'
import { DdlApiTreeWithDiffs } from '../../src/model/ddlapi/tree-with-diffs/tree.impl'
import type { DdlApiTreeNodeWithDiffs } from '../../src/model/ddlapi/types/aliases'
import { DdlApiTreeNodeKinds } from '../../src/model/ddlapi/types/node-kind'

const TEST_DIFFS_META_KEY = Symbol('test-ddl-diffs-meta-key')
const TEST_AGGREGATED_DIFFS_META_KEY = Symbol('test-ddl-aggregated-diffs-meta-key')
const TEST_DIFF_META_KEYS = {
  diffsMetaKey: TEST_DIFFS_META_KEY,
  aggregatedDiffsMetaKey: TEST_AGGREGATED_DIFFS_META_KEY,
}

function buildDescendantDiff(action: typeof DiffAction.add | typeof DiffAction.remove): ChangedPropertyMetaData {
  const diff: Diff<DiffType> = action === DiffAction.add
    ? { type: nonBreaking, action, scope: 'root', afterValue: {}, afterDeclarationPaths: [] }
    : { type: breaking, action, scope: 'root', beforeValue: {}, beforeDeclarationPaths: [] }

  return buildPropertyListSectionWholeNodeChangedPropertyMetaData(diff)
}

async function buildTreeFromSample(baseDir: string, caseId: string) {
  const base = join(__dirname, '../../../samples/ddlapi-diffs', baseDir, caseId)
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
  tree: DdlApiTreeWithDiffs,
  kind: DdlApiTreeNodeWithDiffs['kind'],
  key?: string,
): DdlApiTreeNodeWithDiffs | undefined {
  return Array.from(tree.nodes.values()).find(node => (
    node.kind === kind && (key === undefined || node.key === key)
  ))
}

describe('DDL property-list section pseudo-diffs', () => {
  it('aggregateUniformWholeNodeDescendantDiff sets NODE_LEVEL when every descendant shares add', () => {
    const nodeDiffs = {}
    const nodeDescendantDiffs = {
      id: buildDescendantDiff(DiffAction.add),
      code: buildDescendantDiff(DiffAction.add),
    }

    const result = aggregateUniformWholeNodeDescendantDiff(nodeDiffs, nodeDescendantDiffs, 2)

    expect(result?.[NODE_LEVEL_DIFF_KEY]?.data.action).toBe(DiffAction.add)
    expect(result?.[NODE_LEVEL_DIFF_KEY]?.styles.after.backgroundColor).toBe(HighlightVariant.Green)
    expect(result?.[NODE_LEVEL_DIFF_KEY]?.styles.before.isHeaderVisible).toBe(false)
    expect(result?.[NODE_LEVEL_DIFF_KEY]?.styles.after.isHeaderVisible).toBe(true)
  })

  it('aggregateUniformWholeNodeDescendantDiff skips mixed descendant actions', () => {
    const nodeDiffs = {}
    const nodeDescendantDiffs = {
      id: buildDescendantDiff(DiffAction.remove),
      code: buildDescendantDiff(DiffAction.add),
    }

    const result = aggregateUniformWholeNodeDescendantDiff(nodeDiffs, nodeDescendantDiffs, 2)

    expect(result?.[NODE_LEVEL_DIFF_KEY]).toBeUndefined()
  })

  it('aggregateUniformWholeNodeDescendantDiff preserves an existing NODE_LEVEL diff', () => {
    const inherited = buildDescendantDiff(DiffAction.add)
    const nodeDiffs = { [NODE_LEVEL_DIFF_KEY]: inherited }
    const nodeDescendantDiffs = {
      id: buildDescendantDiff(DiffAction.add),
    }

    const result = aggregateUniformWholeNodeDescendantDiff(nodeDiffs, nodeDescendantDiffs, 1)

    expect(result?.[NODE_LEVEL_DIFF_KEY]).toBe(inherited)
  })

  it('case 203: COLUMNS has no pseudo-diff when only one of two columns changed', async () => {
    const tree = await buildTreeFromSample('column-changes-except-types', '203-add-column-unique')
    const columnsSection = findNode(tree, DdlApiTreeNodeKinds.COLUMNS)

    expect(isDdlPropertyListSectionUniformWholeNodeChange(columnsSection!)).toBe(false)

    expect(columnsSection?.descendantDiffs.code?.data.action).toBe(DiffAction.add)
    expect(columnsSection?.diffs[NODE_LEVEL_DIFF_KEY]).toBeUndefined()
  })

  it('case 01 index-changes: INDEXES gets pseudo-diff when all indexes are added uniformly', async () => {
    const tree = await buildTreeFromSample('index-changes', '01-add-index-when-none-present')
    const indexesSection = findNode(tree, DdlApiTreeNodeKinds.INDEXES)

    expect(indexesSection?.descendantDiffs.idx_t_code?.data.action).toBe(DiffAction.add)
    expect(indexesSection?.diffs[NODE_LEVEL_DIFF_KEY]?.data.action).toBe(DiffAction.add)
    expect(indexesSection?.diffs[NODE_LEVEL_DIFF_KEY]?.styles.after.backgroundColor).toBe(HighlightVariant.Green)
    expect(indexesSection?.diffs[NODE_LEVEL_DIFF_KEY]?.styles.before.isHeaderVisible).toBe(false)
    expect(indexesSection?.diffs[NODE_LEVEL_DIFF_KEY]?.styles.after.isHeaderVisible).toBe(true)
  })

  it('whole-columns 01: COLUMNS gets pseudo-diff when two columns are added to an empty table', async () => {
    const tree = await buildTreeFromSample('whole-columns-changes', '01-add-two-columns-to-empty-table')
    const columnsSection = findNode(tree, DdlApiTreeNodeKinds.COLUMNS)

    expect(isDdlPropertyListSectionUniformWholeNodeChange(columnsSection!)).toBe(true)

    expect(columnsSection?.descendantDiffs.c1?.data.action).toBe(DiffAction.add)
    expect(columnsSection?.descendantDiffs.c2?.data.action).toBe(DiffAction.add)
    expect(columnsSection?.diffs[NODE_LEVEL_DIFF_KEY]?.data.action).toBe(DiffAction.add)
    expect(columnsSection?.diffs[NODE_LEVEL_DIFF_KEY]?.styles.after.backgroundColor).toBe(HighlightVariant.Green)
  })

  it('whole-columns 02: COLUMNS gets pseudo-diff when two columns are removed from a two-column table', async () => {
    const tree = await buildTreeFromSample('whole-columns-changes', '02-remove-two-columns-from-table-with-two-columns')
    const columnsSection = findNode(tree, DdlApiTreeNodeKinds.COLUMNS)

    expect(columnsSection?.descendantDiffs.c1?.data.action).toBe(DiffAction.remove)
    expect(columnsSection?.descendantDiffs.c2?.data.action).toBe(DiffAction.remove)
    expect(columnsSection?.diffs[NODE_LEVEL_DIFF_KEY]?.data.action).toBe(DiffAction.remove)
    expect(columnsSection?.diffs[NODE_LEVEL_DIFF_KEY]?.styles.before.backgroundColor).toBe(HighlightVariant.Red)
  })

  it('whole-indexes 01: INDEXES gets pseudo-diff when two indexes are added uniformly', async () => {
    const tree = await buildTreeFromSample('whole-indexes-changes', '01-add-two-indexes-when-none-present')
    const indexesSection = findNode(tree, DdlApiTreeNodeKinds.INDEXES)

    expect(indexesSection?.descendantDiffs.idx_t_c1?.data.action).toBe(DiffAction.add)
    expect(indexesSection?.descendantDiffs.idx_t_c2?.data.action).toBe(DiffAction.add)
    expect(indexesSection?.diffs[NODE_LEVEL_DIFF_KEY]?.data.action).toBe(DiffAction.add)
    expect(indexesSection?.diffs[NODE_LEVEL_DIFF_KEY]?.styles.after.backgroundColor).toBe(HighlightVariant.Green)
  })

  it('whole-indexes 02: INDEXES gets pseudo-diff when two indexes are removed uniformly', async () => {
    const tree = await buildTreeFromSample('whole-indexes-changes', '02-remove-two-indexes-when-two-present')
    const indexesSection = findNode(tree, DdlApiTreeNodeKinds.INDEXES)

    expect(indexesSection?.descendantDiffs.idx_t_c1?.data.action).toBe(DiffAction.remove)
    expect(indexesSection?.descendantDiffs.idx_t_c2?.data.action).toBe(DiffAction.remove)
    expect(indexesSection?.diffs[NODE_LEVEL_DIFF_KEY]?.data.action).toBe(DiffAction.remove)
    expect(indexesSection?.diffs[NODE_LEVEL_DIFF_KEY]?.styles.before.backgroundColor).toBe(HighlightVariant.Red)
  })

  it('whole-columns 01: column nodes inherit uniform add visibility onto both sides', async () => {
    const tree = await buildTreeFromSample('whole-columns-changes', '01-add-two-columns-to-empty-table')

    for (const columnKey of ['c1', 'c2']) {
      const column = findNode(tree, DdlApiTreeNodeKinds.COLUMN, columnKey)
      const nodeLevelDiff = column?.diffs[NODE_LEVEL_DIFF_KEY]

      expect(nodeLevelDiff?.data.action).toBe(DiffAction.add)
      expect(nodeLevelDiff?.styles.before.isHeaderVisible).toBe(false)
      expect(nodeLevelDiff?.styles.after.isHeaderVisible).toBe(true)
      expect(nodeLevelDiff?.styles.before.isContentVisible).toBe(false)
      expect(nodeLevelDiff?.styles.after.isContentVisible).toBe(true)
      expect(column?.diffs[DDL_PROPERTY_TITLE_ROW_DIFF_KEY]).toBe(nodeLevelDiff)
      expect(isDdlPropertySubheaderVisible(nodeLevelDiff, ORIGIN_LAYOUT_SIDE)).toBe(false)
      expect(isDdlPropertySubheaderVisible(nodeLevelDiff, CHANGED_LAYOUT_SIDE)).toBe(true)
      expect(isDdlPropertyRowContentVisible(nodeLevelDiff, ORIGIN_LAYOUT_SIDE)).toBe(false)
      expect(isDdlPropertyRowContentVisible(nodeLevelDiff, CHANGED_LAYOUT_SIDE)).toBe(true)
    }
  })

  it('whole-columns 02: column nodes inherit uniform remove visibility onto both sides', async () => {
    const tree = await buildTreeFromSample('whole-columns-changes', '02-remove-two-columns-from-table-with-two-columns')

    for (const columnKey of ['c1', 'c2']) {
      const column = findNode(tree, DdlApiTreeNodeKinds.COLUMN, columnKey)
      const nodeLevelDiff = column?.diffs[NODE_LEVEL_DIFF_KEY]

      expect(nodeLevelDiff?.data.action).toBe(DiffAction.remove)
      expect(nodeLevelDiff?.styles.before.isHeaderVisible).toBe(true)
      expect(nodeLevelDiff?.styles.after.isHeaderVisible).toBe(false)
      expect(nodeLevelDiff?.styles.before.isContentVisible).toBe(true)
      expect(nodeLevelDiff?.styles.after.isContentVisible).toBe(false)
      expect(isDdlPropertySubheaderVisible(nodeLevelDiff, ORIGIN_LAYOUT_SIDE)).toBe(true)
      expect(isDdlPropertySubheaderVisible(nodeLevelDiff, CHANGED_LAYOUT_SIDE)).toBe(false)
    }
  })

  it('whole-indexes 01: index nodes inherit uniform add visibility onto both sides', async () => {
    const tree = await buildTreeFromSample('whole-indexes-changes', '01-add-two-indexes-when-none-present')

    for (const indexKey of ['idx_t_c1', 'idx_t_c2']) {
      const indexNode = findNode(tree, DdlApiTreeNodeKinds.INDEX, indexKey)
      const nodeLevelDiff = indexNode?.diffs[NODE_LEVEL_DIFF_KEY]

      expect(nodeLevelDiff?.data.action).toBe(DiffAction.add)
      expect(nodeLevelDiff?.styles.before.isHeaderVisible).toBe(false)
      expect(nodeLevelDiff?.styles.after.isHeaderVisible).toBe(true)
      expect(isDdlPropertySubheaderVisible(nodeLevelDiff, ORIGIN_LAYOUT_SIDE)).toBe(false)
      expect(isDdlPropertySubheaderVisible(nodeLevelDiff, CHANGED_LAYOUT_SIDE)).toBe(true)
    }
  })

  it('case 203: single added column hides origin-side content but unchanged column stays visible', async () => {
    const tree = await buildTreeFromSample('column-changes-except-types', '203-add-column-unique')
    const addedColumn = findNode(tree, DdlApiTreeNodeKinds.COLUMN, 'code')
    const unchangedColumn = findNode(tree, DdlApiTreeNodeKinds.COLUMN, 'id')
    const addedNodeLevelDiff = addedColumn?.diffs[NODE_LEVEL_DIFF_KEY]

    expect(addedNodeLevelDiff?.data.action).toBe(DiffAction.add)
    expect(addedNodeLevelDiff?.styles.before.isHeaderVisible).toBe(false)
    expect(addedNodeLevelDiff?.styles.after.isHeaderVisible).toBe(true)
    expect(isDdlPropertySubheaderVisible(addedNodeLevelDiff, ORIGIN_LAYOUT_SIDE)).toBe(false)
    expect(isDdlPropertySubheaderVisible(addedNodeLevelDiff, CHANGED_LAYOUT_SIDE)).toBe(true)

    expect(unchangedColumn?.diffs[NODE_LEVEL_DIFF_KEY]).toBeUndefined()
    expect(isDdlPropertySubheaderVisible(undefined, ORIGIN_LAYOUT_SIDE)).toBe(true)
    expect(isDdlPropertySubheaderVisible(undefined, CHANGED_LAYOUT_SIDE)).toBe(true)
  })
})
