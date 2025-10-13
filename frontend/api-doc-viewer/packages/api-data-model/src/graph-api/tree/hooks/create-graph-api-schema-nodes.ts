import { buildPointer } from '@netcracker/qubership-apihub-api-unifier'
import { getNodeRules, syncCrawl, SyncCrawlHook } from '@netcracker/qubership-apihub-json-crawl'
import { modelTreeNodeType } from '../../../abstract/constants'
import { graphSchemaNodeKind } from '../../constants'
import { areExcludedComponents } from '../../utils'
import { GraphApiModelTree } from '../model'
import { GraphApiCrawlState, GraphApiTreeComplexNode, GraphApiTreeNode } from '../types'
import { LazyBuildingContext } from '../../../abstract/model/model-tree-node.impl'
import { crawlHooksGraphApiTree } from '../build'
import { isDiff, isDiffMetaRecord, isObject } from '../../../utils'
import { DiffRemove, DiffReplace, isDiffRemove, isDiffReplace } from '@netcracker/qubership-apihub-api-diff'
import { crawlHooksGraphApiDiffTree } from '../../../index'
import { isGraphApiAnyDefinition } from '@netcracker/qubership-apihub-graphapi'

function shouldCrawlDiff(value: unknown): value is DiffRemove | DiffReplace {
  return isDiff(value) &&
    (isDiffRemove(value) || isDiffReplace(value)) &&
    isObject(value.beforeValue)
}

export function createGraphSchemaTreeCrawlHook(
  tree: GraphApiModelTree,
  metaKey?: symbol,
  // FIXME 01.10.25 // Revert "any"
): SyncCrawlHook<any, any> {
  const graphSchemaNodeKinds = Object.keys(graphSchemaNodeKind)

  return ({ value, rules, state, path, key }) => {
    if (key === 'interfaces') {
      return { done: true }
    }
    if (value === undefined || value === null) {
      return { done: true }
    }
    if (typeof key === 'symbol') {
      return { done: true }
    }

    const { parent, container, nodeIdPrefix = '#' } = state
    const id = nodeIdPrefix + buildPointer(path)

    /**
     * Code fragment below is supposed to build part of the tree which contains nodes
     * built from wholly added/removed fragments.
     *
     * E.g. when we change an output type to an input type, or an input type to an array.
     * Merged tree must contain both nodes built from "before" and "after" sources.
     */
    if (
      isGraphApiAnyDefinition(value) &&
      isObject(value) && metaKey && metaKey in value
    ) {
      const diffMeta = value[metaKey]
      if (isDiffMetaRecord(diffMeta)) {
        for (const [field, diff] of Object.entries(diffMeta)) {
          if (!shouldCrawlDiff(diff)) {
            continue
          }
          const nodeRules = getNodeRules(rules, field, [...path, field], diff.beforeValue)
          const nextId = nodeIdPrefix + buildPointer([...path, field])
          syncCrawl(
            diff.beforeValue,
            crawlHooksGraphApiDiffTree(tree as any, metaKey),
            {
              state: {
                parent: parent,
                container: container,
                alreadyConvertedMappingStack: new Map(state.alreadyConvertedMappingStack),
                nodeIdPrefix: nextId,
                treeLevel: state.treeLevel,
                maxTreeLevel: state.maxTreeLevel,
              },
              rules: nodeRules,
            },
          )
        }
      }
    }

    if (!rules) {
      return areExcludedComponents(path) ? { done: true } : { value, state }
    }
    if (!('kind' in rules) || !graphSchemaNodeKinds.includes(rules.kind) || Array.isArray(value)) {
      return areExcludedComponents(path) ? { done: true } : { value, state }
    }

    const { kind } = rules

    // do not count depth for nested nodes if depth of the container is not counted
    let newDataLevel = container ? container.depth !== container.parent?.depth : true
    switch (kind) {
      case graphSchemaNodeKind.args:
        newDataLevel = false
        break
      case graphSchemaNodeKind.output:
        newDataLevel = parent?.kind === graphSchemaNodeKind.property
        break
    }

    const nodeCreationParams = {
      id,
      kind,
      key,
      value,
      parent,
      container,
      newDataLevel: newDataLevel,
      isCycle: false,
    }

    /* Feature "Lazy Tree Building" */
    const lazyBuildingContext: LazyBuildingContext<any, any, any> = {
      tree: tree,
      crawlValue: value,
      crawlHooks: metaKey
        ? crawlHooksGraphApiDiffTree(tree as any, metaKey)
        : crawlHooksGraphApiTree(tree),
      crawlRules: rules,
      alreadyConvertedMappingStack: state.alreadyConvertedMappingStack,
      nodeIdPrefix: id,
      nextLevel: state.treeLevel,
      nextMaxLevel: state.maxTreeLevel,
      metaKey: metaKey,
    }
    /* --- */

    const nodeCreationResult = tree.createGraphSchemaNode(nodeCreationParams, lazyBuildingContext)

    /* Feature "Lazy Tree Building" */
    if (state.treeLevel >= state.maxTreeLevel && !container) {
      return { done: true }
    }
    const nextTreeLevel = state.treeLevel + 1
    /* --- */

    if (container) {
      container.addNestedNode(nodeCreationResult.node)
    } else {
      parent?.addChild(nodeCreationResult.node)
    }

    if (nodeCreationResult.value) {
      // FIXME 02.10.25 // Get rid of it when "SyncCrawlHook<any, any>" is reverted
      const prevStack = state.alreadyConvertedMappingStack as GraphApiCrawlState['alreadyConvertedMappingStack']
      const stack = new Map(prevStack)
      stack.set(value, nodeCreationResult.node as GraphApiTreeNode | GraphApiTreeComplexNode)
      let newState: GraphApiCrawlState
      if (nodeCreationResult.node.type === modelTreeNodeType.simple) {
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
