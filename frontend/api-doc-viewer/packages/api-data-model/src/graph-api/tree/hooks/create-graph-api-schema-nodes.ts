import { buildPointer } from '@netcracker/qubership-apihub-api-unifier';
import { DiffRemove, DiffReplace, isDiffRemove, isDiffReplace } from '@netcracker/qubership-apihub-api-diff';
import { isObject, SyncCrawlHook } from '@netcracker/qubership-apihub-json-crawl';
import { modelTreeNodeType } from "../../../abstract/constants";
import { isDiff } from '../../../utils';
import { graphSchemaNodeKind } from '../../constants';
import { createGraphApiDiffTree } from '../../diff-tree/build';
import { GraphApiDiffTreeNode } from '../../diff-tree/types';
import { areExcludedComponents } from '../../utils';
import { GraphApiModelTree } from '../model';
import { GraphApiCrawlRule, GraphApiCrawlState, GraphApiTreeComplexNode, GraphApiTreeNode } from '../types';

function shouldCrawlDiff(value: unknown): value is DiffRemove | DiffReplace {
  return isDiff(value) &&
    (isDiffRemove(value) || isDiffReplace(value)) &&
    isObject(value.beforeValue)
}

export function createGraphSchemaTreeCrawlHook(
  tree: GraphApiModelTree,
  metaKey?: symbol
): SyncCrawlHook<GraphApiCrawlState, GraphApiCrawlRule> {
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

    const res = tree.createGraphSchemaNode({
      id,
      kind,
      key,
      value,
      parent,
      container,
      newDataLevel: newDataLevel,
      isCycle: false,
    });

    if (container) {
      container.addNestedNode(res.node);
    } else {
      parent?.addChild(res.node);
    }

    if (res.value) {
      const stack = new Map(state.alreadyConvertedMappingStack);
      stack.set(value, res.node as GraphApiTreeNode | GraphApiTreeComplexNode);
      const newState: GraphApiCrawlState = res.node.type === modelTreeNodeType.simple
        ? { parent: res.node as GraphApiTreeNode, alreadyConvertedMappingStack: stack }
        : { parent, container: res.node as GraphApiTreeComplexNode, alreadyConvertedMappingStack: stack };
      return { value: res.value, state: newState };
    } else {
      return { done: true };
    }
  };
}
