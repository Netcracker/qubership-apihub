import { buildPointer } from '@netcracker/qubership-apihub-api-unifier'
import { GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'
import { SyncCrawlHook } from '@netcracker/qubership-apihub-json-crawl'
import {
  crawlHooksGraphApiTree,
  GraphApiCrawlState,
  GraphApiNodeData,
  graphApiNodeKind,
  GraphApiNodeKind,
  graphApiNodeKinds,
  GraphApiNodeMeta,
  GraphApiTreeComplexNode,
  GraphApiTreeNode,
} from '../../index'
import { modelTreeNodeType } from '../../../abstract/constants'
import { ModelTreeNodeParams } from '../../../abstract/model/types'
import { isBrokenRef } from '../../../json-schema/utils'
import { areExcludedComponents } from '../../utils'
import { GraphApiModelTree } from '../model'
import { LazyBuildingContext } from '../../../abstract/model/model-tree-node.impl'

export function createGraphApiTreeCrawlHook(
  tree: GraphApiModelTree,
  // FIXME 01.10.25 // Revert "any"
): SyncCrawlHook<any, any> {
  return ({ value, state, rules, path, key }) => {
    if (key === 'interfaces') {
      return { done: true }
    }
    if (typeof key === 'symbol') {
      return { done: true }
    }
    if (value === undefined || value === null) {
      return { done: true }
    }

    const { parent, container, nodeIdPrefix = '#' } = state
    const id = nodeIdPrefix + buildPointer(path)

    if (!rules) {
      return areExcludedComponents(path) ? { done: true } : { value, state }
    }
    if (!('kind' in rules) || !graphApiNodeKinds.includes(rules.kind)) {
      return areExcludedComponents(path) ? { done: true } : { value, state }
    }

    const { kind } = rules

    let nodeCreationResult: any = {
      value,
      node: {},
    }

    const lazyBuildingContext: LazyBuildingContext<any, any, any> = {
      tree: tree,
      crawlValue: value,
      crawlHooks: crawlHooksGraphApiTree(tree),
      crawlRules: rules,
      alreadyConvertedMappingStack: new Map(state.alreadyConvertedMappingStack),
      nodeIdPrefix: id,
      nextLevel: state.treeLevel,
      nextMaxLevel: state.maxTreeLevel,
    }

    const newDataLevel = false
    switch (kind) {
      case graphApiNodeKind.query:
      case graphApiNodeKind.mutation:
      case graphApiNodeKind.subscription: {
        nodeCreationResult = tree.createGraphSchemaNode({
          id,
          kind,
          key,
          value,
          parent,
          container,
          newDataLevel: newDataLevel,
          isCycle: false,
        }, lazyBuildingContext)
        break
      }
      case graphApiNodeKind.schema: {
        const { description } = value as GraphApiSchema
        const params: ModelTreeNodeParams<GraphApiNodeData, GraphApiNodeKind, GraphApiNodeMeta> = {
          value: { description },
          parent,
          container,
          meta: {
            ...(isBrokenRef(value) ? { brokenRef: value.$ref } : {}),
            _fragment: value,
          },
          newDataLevel: newDataLevel,
        }
        nodeCreationResult.node = tree.createNode(id, kind, key, false, params)
        break
      }
    }

    /* Feature "Lazy Tree Building" */
    if (state.treeLevel >= state.maxTreeLevel) {
      return { done: true }
    }
    const nextTreeLevel = state.treeLevel + 1
    /* --- */

    parent?.addChild(nodeCreationResult.node)

    if (nodeCreationResult.value) {
      // FIXME 02.10.25 // Get rid of it when "SyncCrawlHook<any, any>" is reverted
      const prevStack = state.alreadyConvertedMappingStack as GraphApiCrawlState['alreadyConvertedMappingStack']
      const stack = new Map(prevStack)
      stack.set(value, nodeCreationResult.node)
      let newState: GraphApiCrawlState
      if (nodeCreationResult.node!.type === modelTreeNodeType.simple) {
        newState = {
          parent: nodeCreationResult.node as GraphApiTreeNode,
          alreadyConvertedMappingStack: stack,
          /* Feature "Lazy Tree Building" */
          nodeIdPrefix: nodeIdPrefix,
          treeLevel: nextTreeLevel,
          maxTreeLevel: state.maxTreeLevel,
          /* --- */
        }
      } else {
        newState = {
          parent: parent,
          container: nodeCreationResult.node as GraphApiTreeComplexNode,
          alreadyConvertedMappingStack: stack,
          /* Feature "Lazy Tree Building" */
          nodeIdPrefix: nodeIdPrefix,
          treeLevel: nextTreeLevel,
          maxTreeLevel: state.maxTreeLevel,
          /* --- */
        }
      }
      return { value: nodeCreationResult.value, state: newState }
    } else {
      return { done: true }
    }
  }
}
