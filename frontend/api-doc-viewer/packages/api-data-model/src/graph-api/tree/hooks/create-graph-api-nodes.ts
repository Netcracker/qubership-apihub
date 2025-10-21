import { buildPointer } from '@netcracker/qubership-apihub-api-unifier'
import { GraphApiSchema, isGraphApiAnyDefinition, isGraphApiAnyUsage, isGraphApiOperation } from '@netcracker/qubership-apihub-graphapi'
import { SyncCrawlHook } from '@netcracker/qubership-apihub-json-crawl'
import { modelTreeNodeType } from '../../../abstract/constants'
import { LazyBuildingContext } from '../../../abstract/model/model-tree-node.impl'
import { ModelTreeNodeParams } from '../../../abstract/model/types'
import { isBrokenRef } from '../../../json-schema/utils'
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
import { areExcludedComponents } from '../../utils'
import { GraphApiModelTree } from '../model'

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

    let alreadyExisted = false
    if (isGraphApiAnyDefinition(value)) {
      alreadyExisted = state.alreadyConvertedMappingStack.has(value)
    } else if (isGraphApiAnyUsage(value)) {
      alreadyExisted = state.alreadyConvertedMappingStack.has(value.typeDef)
    } else if (isGraphApiOperation(value)) {
      alreadyExisted = state.alreadyConvertedMappingStack.has(value.output.typeDef)
    }

    // FIXME 02.10.25 // Get rid of it when "SyncCrawlHook<any, any>" is reverted
    const prevStack = state.alreadyConvertedMappingStack as GraphApiCrawlState['alreadyConvertedMappingStack']
    const nextStack = new Map(prevStack)
    if (isGraphApiAnyDefinition(value)) {
      const has = nextStack.has(value)
      !has && nextStack.set(value, null)
    } else if (isGraphApiAnyUsage(value)) {
      const has = nextStack.has(value.typeDef)
      !has && nextStack.set(value.typeDef, null)
    }

    let nodeCreationResult: any = {
      value,
      node: {},
    }

    /* Feature "Lazy Tree Building" */
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
    /* --- */

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
          isCycle: alreadyExisted,
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
        nodeCreationResult.node = tree.createNode(id, kind, key, alreadyExisted, params)
        break
      }
    }

    parent?.addChild(nodeCreationResult.node)

    /* Feature "Lazy Tree Building" */
    if (
      state.treeLevel >= state.maxTreeLevel &&
      nodeCreationResult.node.type === modelTreeNodeType.simple
    ) {
      return { done: true }
    }
    const nextTreeLevel = state.treeLevel + 1
    /* --- */

    // TODO 21.10.25 // Only if "value" === null || "value" === undefined, but such "value" was rejected at the top of the hook
    if (nodeCreationResult.value) {
      let newState: GraphApiCrawlState
      if (nodeCreationResult.node!.type === modelTreeNodeType.simple) {
        newState = {
          parent: nodeCreationResult.node as GraphApiTreeNode,
          alreadyConvertedMappingStack: nextStack,
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
          alreadyConvertedMappingStack: nextStack,
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
