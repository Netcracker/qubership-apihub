import { DiffRemove, DiffReplace, isDiffRemove, isDiffReplace } from '@netcracker/qubership-apihub-api-diff';
import { buildPointer } from '@netcracker/qubership-apihub-api-unifier';
import { isObject, SyncCrawlHook } from '@netcracker/qubership-apihub-json-crawl';
import { modelTreeNodeType } from "../../../abstract/constants";
import { isDiff } from '../../../utils';
import { graphSchemaNodeKind } from '../../constants';
import { createGraphApiDiffTree } from '../../diff-tree/build';
import { GraphApiDiffTreeNode } from '../../diff-tree/types';
import { areExcludedComponents } from '../../utils';
import { GraphApiModelTree } from '../model';
import { GraphApiCrawlState, GraphApiTreeComplexNode, GraphApiTreeNode } from '../types';
import { LazyBuildingContext } from "@apihub/abstract-model/model/model-tree-node.impl";
import { crawlHooksGraphApiTree } from "@apihub/graph-api-model/tree/build";

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

    const id = '#' + buildPointer(path);
    const { parent, container } = state;

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
      if (shouldCrawlDiff(diffMeta)) {
        const subTree = createSubTree(diffMeta.beforeValue)
        subTree?.root && parent?.addChild(subTree.root)
      } else if (isObject(diffMeta)) {
        for (const [key, maybeDiff] of Object.entries(diffMeta)) {
          if (shouldCrawlDiff(maybeDiff)) {
            const subTree = createSubTree(maybeDiff.beforeValue, `/${key}`)
            subTree?.root && parent?.addChild(subTree.root)
          }
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
    if (state.treeLevel === state.maxTreeLevel) {
      return { done: true };
    }

    const nextTreeLevel = state.treeLevel + 1;
    /* --- */

    if (nodeCreationResult.value) {
      const stack = new Map(state.alreadyConvertedMappingStack);
      stack.set(value, nodeCreationResult.node as GraphApiTreeNode | GraphApiTreeComplexNode);
      let newState: GraphApiCrawlState
      if (nodeCreationResult.node.type === modelTreeNodeType.simple) {
        newState = {
          parent: nodeCreationResult.node as GraphApiTreeNode,
          // @ts-expect-error FIXME 01.10.25 // Fix types
          alreadyConvertedMappingStack: stack,
          /* Feature "Lazy Tree Building" */
          treeLevel: nextTreeLevel,
          maxTreeLevel: state.maxTreeLevel,
          /* --- */
        }
      } else {
        newState = {
          parent: parent,
          container: nodeCreationResult.node as GraphApiTreeComplexNode,
          // @ts-expect-error FIXME 01.10.25 // Fix types
          alreadyConvertedMappingStack: stack,
          /* Feature "Lazy Tree Building" */
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
