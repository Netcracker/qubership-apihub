import { buildPointer } from '@netcracker/qubership-apihub-api-unifier';
import { DiffType } from '@netcracker/qubership-apihub-api-diff';
import { GraphApiSchema } from '@netcracker/qubership-apihub-graphapi';
import { SyncCrawlHook } from '@netcracker/qubership-apihub-json-crawl';
import { GraphApiDiffComplexNode, GraphApiDiffCrawlRule, GraphApiDiffCrawlState, GraphApiDiffNodeData, GraphApiDiffNodeMeta, GraphApiDiffTreeNode, graphApiNodeKind, graphApiNodeKinds, type GraphApiNodeKind } from '../..';
import { modelTreeNodeType } from "../../../abstract/constants";
import { ModelTreeNodeParams } from '../../../abstract/model/types';
import { isBrokenRef } from '../../../json-schema';
import { areExcludedComponents } from '../../utils';
import { GraphApiModelDiffTree } from '../model';
import { collectSchemaChildrenChanges } from '../utils';

export function createGraphApiDiffTreeCrawlHook(
  tree: GraphApiModelDiffTree<GraphApiDiffNodeData, GraphApiNodeKind, GraphApiDiffNodeMeta>,
  metaKey: symbol
): SyncCrawlHook<GraphApiDiffCrawlState, GraphApiDiffCrawlRule> {
  return ({ value, state, rules, path, key }) => {
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

    const id = '#' + buildPointer(path);
    const { parent, container, source } = state;
    const { kind } = rules;

    let result: any = {
      value,
      node: {},
    };

    switch (kind) {
      case graphApiNodeKind.query:
      case graphApiNodeKind.mutation:
      case graphApiNodeKind.subscription: {
        result = tree.createGraphSchemaNode({ id, kind, key, value, parent, newDataLevel: false, isCycle: false });
        break;
      }
      case graphApiNodeKind.schema: {
        const { description } = value as GraphApiSchema;
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
        };
        result.node = tree.createNode(id, kind, key, false, params);
        break;
      }
    }

    parent?.addChild(result.node);

    if (result.value) {
      const stack = new Map(state.alreadyConvertedMappingStack);
      stack.set(value, result.node);
      const newState: GraphApiDiffCrawlState = result.node!.type === modelTreeNodeType.simple
        ? { parent: result.node as GraphApiDiffTreeNode, source, alreadyConvertedMappingStack: stack }
        : { parent, container: result.node as GraphApiDiffComplexNode, source, alreadyConvertedMappingStack: stack };
      return { value: result.value, state: newState };
    } else {
      return { done: true };
    }
  };
}
