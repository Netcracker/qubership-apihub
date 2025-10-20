import { buildPointer } from '@netcracker/qubership-apihub-api-unifier'
// import { DiffType } from '@netcracker/qubership-apihub-api-diff';
import { GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'
import { SyncCrawlHook } from '@netcracker/qubership-apihub-json-crawl'
import {
  crawlHooksGraphApiDiffTree,
  GraphApiDiffComplexNode,
  GraphApiDiffCrawlState,
  GraphApiDiffNodeData,
  GraphApiDiffNodeMeta,
  GraphApiDiffTreeNode,
  type GraphApiNodeKind,
  graphApiNodeKind,
  graphApiNodeKinds,
} from '../..'
import { modelTreeNodeType } from '../../../abstract/constants'
import { ModelTreeNodeParams } from '../../../abstract/model/types'
import { isBrokenRef } from '../../../json-schema'
import { areExcludedComponents } from '../../utils'
import { GraphApiModelDiffTree } from '../model'
import { collectSchemaChildrenChanges } from '../utils'
import { LazyBuildingContext } from '../../../abstract/model/model-tree-node.impl'
import { DiffType } from '@netcracker/qubership-apihub-api-diff'

export function createGraphApiDiffTreeCrawlHook(
  tree: GraphApiModelDiffTree<GraphApiDiffNodeData, GraphApiNodeKind, GraphApiDiffNodeMeta>,
  metaKey: symbol,
  aggregatedMetaKey?: symbol,
  // FIXME 06.10.25 // Revert "any"
): SyncCrawlHook<any, any> {
  return ({ value, state, rules, path, key }) => {
    if (key === 'interfaces') {
      return { done: true }
    }
    if (typeof key === 'symbol') {
      return { done: true }
    }
    if (value === null || value === undefined) {
      return { done: true }
    }
    if (!rules) {
      return areExcludedComponents(path) ? { done: true } : { value, state }
    }
    if (!('kind' in rules) || !graphApiNodeKinds.includes(rules.kind)) {
      return areExcludedComponents(path) ? { done: true } : { value, state }
    }

    const { parent, /* container,  */nodeIdPrefix = '#' } = state
    const id = nodeIdPrefix + buildPointer(path)
    const { kind } = rules

    const lazyBuildingContext: LazyBuildingContext<any, any, any> = {
      tree: tree,
      crawlValue: value,
      crawlHooks: crawlHooksGraphApiDiffTree(tree, metaKey, aggregatedMetaKey),
      crawlRules: rules,
      alreadyConvertedMappingStack: new Map(state.alreadyConvertedMappingStack),
      nodeIdPrefix: id,
      nextLevel: state.treeLevel,
      nextMaxLevel: state.maxTreeLevel + 1,
    }

    let nodeCreationResult: any = {
      value,
      node: {},
    }

    const alreadyExisted = state.alreadyConvertedMappingStack.has(value)

    switch (kind) {
      case graphApiNodeKind.query:
      case graphApiNodeKind.mutation:
      case graphApiNodeKind.subscription: {
        nodeCreationResult = tree.createGraphSchemaNode(
          { id, kind, key, value, parent, newDataLevel: false, isCycle: alreadyExisted },
          lazyBuildingContext,
        )
        break
      }
      case graphApiNodeKind.schema: {
        const { description } = value as GraphApiSchema
        const params: ModelTreeNodeParams<GraphApiDiffNodeData, GraphApiNodeKind, GraphApiDiffNodeMeta> = {
          value: { description },
          parent,
          meta: {
            ...(isBrokenRef(value) ? { brokenRef: value.$ref } : {}),
            _fragment: value,
            // diffs
            // $nodeChange: undefined,
            // $metaChanges: undefined,
            $childrenChanges: collectSchemaChildrenChanges(value, metaKey),
            // $nestedChanges: undefined,
            $nodeChangesSummary: new Set<DiffType>(),
          },
          newDataLevel: false,
        }
        nodeCreationResult.node = tree.createNode(id, kind, key, alreadyExisted, params, lazyBuildingContext)
        break
      }
    }

    parent?.addChild(nodeCreationResult.node)

    if (alreadyExisted) {
      return { done: true }
    }

    /* Feature "Lazy Tree Building" */
    if (
      state.treeLevel >= state.maxTreeLevel && 
      nodeCreationResult.node.type === modelTreeNodeType.simple
    ) {
      return { done: true }
    }
    const nextTreeLevel = state.treeLevel + 1
    /* --- */

    if (nodeCreationResult.value) {
      const prevStack = state.alreadyConvertedMappingStack as GraphApiDiffCrawlState['alreadyConvertedMappingStack']
      const stack = new Map(prevStack)
      stack.set(value, nodeCreationResult.node)
      const newState: GraphApiDiffCrawlState = nodeCreationResult.node!.type === modelTreeNodeType.simple
        ? {
          parent: nodeCreationResult.node as GraphApiDiffTreeNode,
          alreadyConvertedMappingStack: stack,
          /* Feature "Lazy Tree Building" */
          nodeIdPrefix: nodeIdPrefix,
          treeLevel: nextTreeLevel,
          maxTreeLevel: state.maxTreeLevel,
          /* --- */
        }
        : {
          parent,
          container: nodeCreationResult.node as GraphApiDiffComplexNode,
          alreadyConvertedMappingStack: stack,
          /* Feature "Lazy Tree Building" */
          nodeIdPrefix: nodeIdPrefix,
          treeLevel: nextTreeLevel,
          maxTreeLevel: state.maxTreeLevel,
          /* --- */
        }
      return { value: nodeCreationResult.value, state: newState }
    } else {
      return { done: true }
    }
  }
}
