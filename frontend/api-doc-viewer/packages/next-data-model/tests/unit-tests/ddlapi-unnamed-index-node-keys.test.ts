import { readFileSync } from 'fs'
import { join } from 'path'
import { NODE_LEVEL_DIFF_KEY } from '@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface'
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

function findIndexNodes(tree: ReturnType<DdlApiTreeWithDiffsBuilder['build']>) {
  return Array.from(tree.nodes.values()).filter(node => node.kind === DdlApiTreeNodeKinds.INDEX)
}

describe('unnamed index node keys and whole-node diffs', () => {
  it.each([
    '19-unnamed-index-append-column',
    '20-unnamed-index-pop-column',
    '22-unnamed-index-became-unique',
    '23-unnamed-index-lost-unique',
  ])('maps remove/add onto distinct unnamed index nodes (%s)', async (caseId) => {
    const tree = await buildTree(caseId)
    const indexNodes = findIndexNodes(tree)

    expect(indexNodes).toHaveLength(2)
    expect(new Set(indexNodes.map(node => node.key)).size).toBe(2)

    const removeNode = indexNodes.find(
      node => node.diffs[NODE_LEVEL_DIFF_KEY]?.data.action === DiffAction.remove,
    )
    const addNode = indexNodes.find(
      node => node.diffs[NODE_LEVEL_DIFF_KEY]?.data.action === DiffAction.add,
    )

    expect(removeNode).toBeDefined()
    expect(addNode).toBeDefined()
  })
})
