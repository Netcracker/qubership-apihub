import { DiffRemove, DiffReplace, isDiffRemove, isDiffReplace } from '@netcracker/qubership-apihub-api-diff';
import { buildPointer } from '@netcracker/qubership-apihub-api-unifier';
import { isObject, SyncCrawlHook } from '@netcracker/qubership-apihub-json-crawl';
import { modelTreeNodeType } from "@apihub/api-data-model/abstract-model/constants";
import { isDiff, isDiffMetaRecord } from '@apihub/api-data-model/utils';
import { graphSchemaNodeKind } from '@apihub/api-data-model/graph-api-model/constants';
import { createGraphApiDiffTree } from '@apihub/api-data-model/graph-api-model/diff-tree/build';
import { GraphApiDiffTreeNode } from '@apihub/api-data-model/graph-api-model/diff-tree/types';
import { areExcludedComponents } from '@apihub/api-data-model/graph-api-model/utils';
import { GraphApiModelTree } from '@apihub/api-data-model/graph-api-model/tree/model';
import {
  GraphApiCrawlState,
  GraphApiTreeComplexNode,
  GraphApiTreeNode
} from '@apihub/api-data-model/graph-api-model/tree/types';
import { LazyBuildingContext } from "@apihub/api-data-model/abstract-model/model/model-tree-node.impl";
import { crawlHooksGraphApiTree } from "@apihub/api-data-model/graph-api-model/tree/build";

function shouldCrawlDiff(value: unknown): value is DiffRemove | DiffReplace {
  return isDiff(value) &&
    (isDiffRemove(value) || isDiffReplace(value)) &&
    isObject(value.beforeValue)
}

export function createGraphSchemaTreeCrawlHook(
  tree: GraphApiModelTree,
  metaKey?: symbol
  // FIXME 01.10.25 // Revert "any"
): SyncCrawlHook<any, any> {
  const graphSchemaNodeKinds = Object.keys(graphSchemaNodeKind);

  return ({ value, rules, state, path, key }) => {
    if (value === undefined || value === null) {
      return { done: true };
    }
    if (typeof key === 'symbol') {
      return { done: true };
    }

    const { parent, container, nodeIdPrefix = '#' } = state;
    const id = nodeIdPrefix + buildPointer(path);

    /**
     * Code fragment below is supposed to build part of the tree which contains nodes
     * built from wholly added/removed fragments.
     *
     * E.g. when we change an output type to an input type, or an input type to an array.
     * Merged tree must contain both nodes built from "before" and "after" sources.
     */
    /* TODO 03.10.25 // Use new lazy-building approach for building this tree part.
        New approach will resolve TODOs below. */
    if (isObject(value) && metaKey && metaKey in value) {
      // TODO 27.11.24 // Fix paths of sub-tree nodes. They must start from the same subpath
      const createSubTree =
        (subSource: unknown, ruleKey: string = `/${key}`) => {
          // TODO 27.11.24 // Refactor it
          const subRules = rules ? (rules as any)[ruleKey] : undefined
          if (!subRules) {
            return null
          }
          return createGraphApiDiffTree(subSource, metaKey, {
            rules: subRules,
            state: {
              parent: parent as GraphApiDiffTreeNode | null,
              source: subSource,
              alreadyConvertedMappingStack: new Map(state.alreadyConvertedMappingStack)
            }
          })
        };

      const diffMeta = value[metaKey]
      // TODO 27.11.24 // parent will have child with kind = 'root'!
      if (isDiffMetaRecord(diffMeta)) {
        for (const [fieldKey, diff] of Object.entries(diffMeta)) {
          if (!shouldCrawlDiff(diff)) {
            continue
          }
          const subTree = createSubTree(diff.beforeValue, `/${fieldKey}`)
          subTree?.root && parent?.addChild(subTree.root)
        }
      }
    }

    if (!rules) {
      return areExcludedComponents(path) ? { done: true } : { value, state }
    }
    if (!('kind' in rules) || !graphSchemaNodeKinds.includes(rules.kind) || Array.isArray(value)) {
      return areExcludedComponents(path) ? { done: true } : { value, state }
    }

    const { kind } = rules;

    // do not count depth for nested nodes if depth of the container is not counted
    let newDataLevel = container ? container.depth !== container.parent?.depth : true;
    switch (kind) {
      case graphSchemaNodeKind.args:
        newDataLevel = false;
        break;
      case graphSchemaNodeKind.output:
        newDataLevel = parent?.kind === graphSchemaNodeKind.property;
        break;
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
      crawlHooks: crawlHooksGraphApiTree(tree),
      crawlRules: rules,
      alreadyConvertedMappingStack: state.alreadyConvertedMappingStack,
      nodeIdPrefix: id,
      nextLevel: state.treeLevel + 1,
      nextMaxLevel: state.maxTreeLevel + 1,
    }
    /* --- */

    const nodeCreationResult = tree.createGraphSchemaNode(nodeCreationParams, lazyBuildingContext);

    if (container) {
      container.addNestedNode(nodeCreationResult.node);
    } else {
      parent?.addChild(nodeCreationResult.node);
    }

    /* Feature "Lazy Tree Building" */
    if (
      state.treeLevel >= state.maxTreeLevel &&
      nodeCreationResult.node.type === 'simple'
    ) {
      return { done: true };
    }

    const nextTreeLevel = state.treeLevel + 1;
    /* --- */

    if (nodeCreationResult.value) {
      // FIXME 02.10.25 // Get rid of it when "SyncCrawlHook<any, any>" is reverted
      const prevStack = state.alreadyConvertedMappingStack as GraphApiCrawlState['alreadyConvertedMappingStack']
      const stack = new Map(prevStack);
      stack.set(value, nodeCreationResult.node as GraphApiTreeNode | GraphApiTreeComplexNode);
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
      return { value: nodeCreationResult.value, state: newState };
    } else {
      return { done: true };
    }
  };
}
