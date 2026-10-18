import { NODE_LEVEL_DIFF_KEY, NodeDiffsSeverityPlacemennt } from '@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface'
import { CHANGED_LAYOUT_SIDE, ORIGIN_LAYOUT_SIDE } from '@apihub/next-data-model/model/abstract/layout-side'
import { DDL_PROPERTY_TITLE_ROW_DIFF_KEY, isDdlPropertySubheaderVisible } from '@apihub/next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs'
import { DdlApiTreeNodeKinds } from '@apihub/next-data-model/model/ddlapi/types/node-kind'
import { buildFromDdl } from '@netcracker/qubership-apihub-ddlapi/parser'
import { apiDiff, DiffAction } from '@netcracker/qubership-apihub-api-diff'
import fs from 'fs'
import path from 'path'
import { createBuildingServiceLogger } from '../../src/loggers'
import { DdlApiSpecWithDiffsTransformer } from '../../src/building-service/ddlapi/shared/ddlapi-spec-with-diffs-transformer'
import { DdlApiNodeDiffsAggregatorKindTable } from '../../src/building-service/ddlapi/tree-with-diffs/node-diffs-data/node-diffs/kind-table'
import { DdlApiTreeWithDiffsBuilder } from '../../src/building-service/ddlapi/tree-with-diffs/builder'
import type { DdlApiTreeNodeWithDiffs } from '../../src/model/ddlapi/types/aliases'

const TEST_DIFFS_META_KEY = Symbol('test-ddl-diffs-meta-key')
const TEST_AGGREGATED_DIFFS_META_KEY = Symbol('test-ddl-aggregated-diffs-meta-key')
const TEST_DIFF_META_KEYS = {
  diffsMetaKey: TEST_DIFFS_META_KEY,
  aggregatedDiffsMetaKey: TEST_AGGREGATED_DIFFS_META_KEY,
}

function realmHasTables(realm: Awaited<ReturnType<typeof buildFromDdl>>): boolean {
  for (const schema of realm.schemas ?? []) {
    if ((schema.tables ?? []).length > 0) {
      return true
    }
  }
  return false
}

function emptyRealmLike(present: Awaited<ReturnType<typeof buildFromDdl>>) {
  return {
    ddlapi: present.ddlapi,
    schemas: (present.schemas ?? []).map(({ name }) => ({ name, tables: [] })),
  }
}

function resolveDdlDiffCompareSide(
  side: Awaited<ReturnType<typeof buildFromDdl>>,
  counterpart: Awaited<ReturnType<typeof buildFromDdl>>,
) {
  if (realmHasTables(side) || !realmHasTables(counterpart)) {
    return side
  }
  return emptyRealmLike(counterpart)
}

async function mergeWholeTableSample(caseId: string) {
  const base = path.join(__dirname, '../../../samples/ddlapi-diffs/whole-table-changes', caseId)
  const before = await buildFromDdl(fs.readFileSync(path.join(base, 'before.sql'), 'utf8'))
  const after = await buildFromDdl(fs.readFileSync(path.join(base, 'after.sql'), 'utf8'))
  return apiDiff(
    resolveDdlDiffCompareSide(before, after),
    resolveDdlDiffCompareSide(after, before),
    { metaKey: TEST_DIFFS_META_KEY, normalizedResult: false },
  ).merged
}

function buildWholeTableTree(caseId: string, tableKey: { schemaName: string; name: string }) {
  return mergeWholeTableSample(caseId).then(merged => new DdlApiTreeWithDiffsBuilder({
    source: merged,
    tableKey,
    diffsMetaKeys: TEST_DIFF_META_KEYS,
    logger: createBuildingServiceLogger(),
  }).build())
}

function findNode(
  tree: ReturnType<DdlApiTreeWithDiffsBuilder['build']>,
  kind: DdlApiTreeNodeWithDiffs['kind'],
  key?: string,
) {
  return Array.from(tree.nodes.values()).find(node => (
    node.kind === kind && (key === undefined || node.key === key)
  ))
}

describe('DDL whole-table node diffs', () => {
  const transformer = new DdlApiSpecWithDiffsTransformer(
    createBuildingServiceLogger(),
    TEST_DIFF_META_KEYS,
  )

  it('maps whole-table add diffs onto the transformed table row', async () => {
    const merged = await mergeWholeTableSample('01-wholly-added-table')
    const spec = transformer.transformSourceToTableOrientedSpecWithDiffs(merged, {
      schemaName: 'public',
      name: 't',
    })

    const tableDiffs = spec?.[TEST_DIFFS_META_KEY] as Record<string, { action?: string }> | undefined
    expect(tableDiffs?.[NODE_LEVEL_DIFF_KEY]?.action).toBe(DiffAction.add)
  })

  it('maps whole-table remove diffs onto the transformed table row', async () => {
    const merged = await mergeWholeTableSample('02-wholly-removed-table')
    const spec = transformer.transformSourceToTableOrientedSpecWithDiffs(merged, {
      schemaName: 'public',
      name: 't',
    })

    const tableDiffs = spec?.[TEST_DIFFS_META_KEY] as Record<string, { action?: string }> | undefined
    expect(tableDiffs?.[NODE_LEVEL_DIFF_KEY]?.action).toBe(DiffAction.remove)
  })

  it('aggregates whole-table add onto TABLE node title-row diff', async () => {
    const merged = await mergeWholeTableSample('01-wholly-added-table')
    const tree = new DdlApiTreeWithDiffsBuilder({
      source: merged,
      tableKey: { schemaName: 'public', name: 't' },
      diffsMetaKeys: TEST_DIFF_META_KEYS,
      logger: createBuildingServiceLogger(),
    }).build()

    const tableNode = tree.root
    expect(tableNode?.kind).toBe(DdlApiTreeNodeKinds.TABLE)
    expect(tableNode?.diffs[NODE_LEVEL_DIFF_KEY]?.data.action).toBe(DiffAction.add)
    expect(tableNode?.diffs[DDL_PROPERTY_TITLE_ROW_DIFF_KEY]).toBe(tableNode?.diffs[NODE_LEVEL_DIFF_KEY])
    expect(tableNode?.diffsSeverities?.[NodeDiffsSeverityPlacemennt.TitleRow]).toBeDefined()
  })

  it('aggregates whole-table remove onto TABLE node title-row diff', async () => {
    const merged = await mergeWholeTableSample('02-wholly-removed-table')
    const tree = new DdlApiTreeWithDiffsBuilder({
      source: merged,
      tableKey: { schemaName: 'public', name: 't' },
      diffsMetaKeys: TEST_DIFF_META_KEYS,
      logger: createBuildingServiceLogger(),
    }).build()

    const tableNode = tree.root
    expect(tableNode?.diffs[NODE_LEVEL_DIFF_KEY]?.data.action).toBe(DiffAction.remove)
    expect(tableNode?.diffs[DDL_PROPERTY_TITLE_ROW_DIFF_KEY]).toBe(tableNode?.diffs[NODE_LEVEL_DIFF_KEY])
  })

  it('derives title-row diff from crawl whole-table add via kind-table aggregator', () => {
    const aggregator = new DdlApiNodeDiffsAggregatorKindTable()
    const crawlValue = {
      tableName: 't',
      schemaName: 'public',
      [TEST_DIFFS_META_KEY]: {
        [NODE_LEVEL_DIFF_KEY]: {
          type: 'nonBreaking',
          action: DiffAction.add,
          scope: 'root',
          afterValue: { tableName: 't' },
          afterDeclarationPaths: [['schemas', 'public', 'tables', 't']],
        },
      },
    }

    const nodeDiffs = aggregator.aggregate(crawlValue, TEST_DIFF_META_KEYS, 'table')
    expect(nodeDiffs?.[NODE_LEVEL_DIFF_KEY]?.data.action).toBe(DiffAction.add)
    expect(nodeDiffs?.[DDL_PROPERTY_TITLE_ROW_DIFF_KEY]).toBe(nodeDiffs?.[NODE_LEVEL_DIFF_KEY])
  })

  it('inherits whole-table add onto column and index descendants', async () => {
    const tree = await buildWholeTableTree('01-wholly-added-table', { schemaName: 'public', name: 't' })
    const tableNode = tree.root

    expect(tableNode?.descendantDiffs.columns?.data.action).toBe(DiffAction.add)
    expect(tableNode?.descendantDiffs.id?.data.action).toBe(DiffAction.add)

    const idColumn = findNode(tree, DdlApiTreeNodeKinds.COLUMN, 'id')
    expect(idColumn?.diffs[NODE_LEVEL_DIFF_KEY]?.data.action).toBe(DiffAction.add)
    expect(idColumn?.diffs[NODE_LEVEL_DIFF_KEY]?.inherited).toBe(true)
    expect(idColumn?.diffs[DDL_PROPERTY_TITLE_ROW_DIFF_KEY]).toBe(idColumn?.diffs[NODE_LEVEL_DIFF_KEY])
    expect(idColumn?.diffs[NODE_LEVEL_DIFF_KEY]?.styles.before.isHeaderVisible).toBe(false)
    expect(idColumn?.diffs[NODE_LEVEL_DIFF_KEY]?.styles.after.isHeaderVisible).toBe(true)
    expect(isDdlPropertySubheaderVisible(idColumn?.diffs[NODE_LEVEL_DIFF_KEY], ORIGIN_LAYOUT_SIDE)).toBe(false)
    expect(isDdlPropertySubheaderVisible(idColumn?.diffs[NODE_LEVEL_DIFF_KEY], CHANGED_LAYOUT_SIDE)).toBe(true)

    const columnsSection = findNode(tree, DdlApiTreeNodeKinds.COLUMNS)
    expect(columnsSection?.diffs[NODE_LEVEL_DIFF_KEY]?.data.action).toBe(DiffAction.add)
    expect(columnsSection?.descendantDiffs.id?.data.action).toBe(DiffAction.add)
    expect(columnsSection?.diffs[NODE_LEVEL_DIFF_KEY]?.styles.after.isHeaderVisible).toBe(true)
    expect(columnsSection?.diffs[NODE_LEVEL_DIFF_KEY]?.styles.before.isHeaderVisible).toBe(false)
  })

  it('inherits whole-table remove onto column descendants', async () => {
    const tree = await buildWholeTableTree('02-wholly-removed-table', { schemaName: 'public', name: 't' })
    const idColumn = findNode(tree, DdlApiTreeNodeKinds.COLUMN, 'id')

    expect(idColumn?.diffs[NODE_LEVEL_DIFF_KEY]?.data.action).toBe(DiffAction.remove)
    expect(idColumn?.diffs[NODE_LEVEL_DIFF_KEY]?.inherited).toBe(true)
    expect(idColumn?.diffs[DDL_PROPERTY_TITLE_ROW_DIFF_KEY]).toBe(idColumn?.diffs[NODE_LEVEL_DIFF_KEY])
    expect(idColumn?.diffs[NODE_LEVEL_DIFF_KEY]?.styles.before.isHeaderVisible).toBe(true)
    expect(idColumn?.diffs[NODE_LEVEL_DIFF_KEY]?.styles.after.isHeaderVisible).toBe(false)
    expect(isDdlPropertySubheaderVisible(idColumn?.diffs[NODE_LEVEL_DIFF_KEY], ORIGIN_LAYOUT_SIDE)).toBe(true)
    expect(isDdlPropertySubheaderVisible(idColumn?.diffs[NODE_LEVEL_DIFF_KEY], CHANGED_LAYOUT_SIDE)).toBe(false)
  })

  it('inherits whole-table add onto index descendants', async () => {
    const tree = await buildWholeTableTree('03-wholly-added-table-with-index', { schemaName: 'public', name: 't' })
    const tableNode = tree.root

    expect(tableNode?.descendantDiffs.indexes?.data.action).toBe(DiffAction.add)

    const indexNode = findNode(tree, DdlApiTreeNodeKinds.INDEX, 'idx_t_id')
    expect(indexNode?.diffs[NODE_LEVEL_DIFF_KEY]?.data.action).toBe(DiffAction.add)
    expect(indexNode?.diffs[NODE_LEVEL_DIFF_KEY]?.inherited).toBe(true)
    expect(indexNode?.diffs[DDL_PROPERTY_TITLE_ROW_DIFF_KEY]).toBe(indexNode?.diffs[NODE_LEVEL_DIFF_KEY])

    const indexesSection = findNode(tree, DdlApiTreeNodeKinds.INDEXES)
    expect(indexesSection?.diffs[NODE_LEVEL_DIFF_KEY]?.data.action).toBe(DiffAction.add)
    expect(indexesSection?.descendantDiffs.idx_t_id?.data.action).toBe(DiffAction.add)
    expect(indexesSection?.diffs[NODE_LEVEL_DIFF_KEY]?.styles.after.isHeaderVisible).toBe(true)
    expect(indexesSection?.diffs[NODE_LEVEL_DIFF_KEY]?.styles.before.isHeaderVisible).toBe(false)
  })

  it('inherits whole-table remove onto index descendants', async () => {
    const tree = await buildWholeTableTree('04-wholly-removed-table-with-index', { schemaName: 'public', name: 't' })
    const indexNode = findNode(tree, DdlApiTreeNodeKinds.INDEX, 'idx_t_id')

    expect(indexNode?.diffs[NODE_LEVEL_DIFF_KEY]?.data.action).toBe(DiffAction.remove)
    expect(indexNode?.diffs[NODE_LEVEL_DIFF_KEY]?.inherited).toBe(true)
    expect(indexNode?.diffs[DDL_PROPERTY_TITLE_ROW_DIFF_KEY]).toBe(indexNode?.diffs[NODE_LEVEL_DIFF_KEY])
  })
})
