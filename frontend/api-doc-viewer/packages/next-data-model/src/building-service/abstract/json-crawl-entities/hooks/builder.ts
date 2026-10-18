import { ITreeNodeWithDiffs } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { isDiffReplace } from "@netcracker/qubership-apihub-api-diff";
import { buildPointer } from "@netcracker/qubership-apihub-api-unifier";
import { isArray, SyncCrawlHook } from "@netcracker/qubership-apihub-json-crawl";
import { ITreeNode } from "../../../../model/abstract/tree/tree-node.interface";
import { isObject } from "../../../../utilities";
import { NodeId, NodeKey } from "../../../../utility-types";
import { SchemaCrawlRule } from "../../../jso/json-crawl-entities/rules/types";
import { CommonState } from "../state/types";

type NodeCache<
  V extends object | null,
  K extends string,
  M extends object,
  N extends ITreeNode<V, K, M>
> = Map<unknown, N>;

function defaultIsDisallowedValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (!isObject(value) && !isArray(value))
  );
}

type CycleCloneFactory<
  V extends object | null,
  K extends string,
  M extends object,
  N extends ITreeNode<V, K, M>
> = {
  createCycledClone: (
    sourceNode: N,
    cloneId: NodeId,
    cloneKey: NodeKey,
    cloneParent: N | null,
  ) => N
}

export interface TreeBuildingHooksFactoryParams<
  V extends object | null,
  K extends string,
  M extends object,
  N extends ITreeNode<V, K, M>,
  S extends CommonState<V, K, M, N>,
  P extends {
    value: NonNullable<unknown> | null
    newDataLevel: boolean
    parent: N | null
    container: N | null
  },
> {
  source: unknown
  tree: CycleCloneFactory<V, K, M, N>
  supportedNodeKinds: readonly K[]
  createNodeFromRaw: (
    id: NodeId,
    key: NodeKey,
    kind: K,
    complex: boolean,
    params: P
  ) => N | undefined
  createNodeParams: (
    value: unknown,
    parent: N | null,
    container: N | null,
  ) => P
  createStateForSimpleNode: (
    state: S,
    node: N,
    cache: NodeCache<V, K, M, N>,
  ) => S
  createStateForComplexNode: (
    state: S,
    node: N,
    cache: NodeCache<V, K, M, N>,
  ) => S
  isSimpleNode: (node: N) => boolean
  isComplexNode: (node: N) => boolean
  resolveNodeKey: (key: NodeKey, value: unknown) => NodeKey
  isDisallowedValue?: (value: unknown) => boolean
  shouldStopAfterNodeCreation?: (node: N, value: unknown) => boolean
}

export function createTreeBuildingHooks<
  V extends object | null,
  K extends string,
  M extends object,
  N extends ITreeNode<V, K, M>,
  S extends CommonState<V, K, M, N>,
  R extends SchemaCrawlRule<K, S>,
  P extends {
    value: NonNullable<unknown> | null
    newDataLevel: boolean
    parent: N | null
    container: N | null
  },
>(
  params: TreeBuildingHooksFactoryParams<V, K, M, N, S, P>
): [
    SyncCrawlHook<S, R>,
    SyncCrawlHook<S, R>,
    SyncCrawlHook<S, R>,
  ] {
  const {
    source,
    tree,
    supportedNodeKinds,
    createNodeFromRaw,
    createNodeParams,
    createStateForSimpleNode,
    createStateForComplexNode,
    isSimpleNode,
    isComplexNode,
    resolveNodeKey,
    isDisallowedValue = defaultIsDisallowedValue,
    shouldStopAfterNodeCreation,
  } = params;

  const preventInfiniteLoopHook: SyncCrawlHook<S, R> = ({ value, state, key, path }) => {
    if (typeof key === "symbol") {
      return;
    }
    if (!isObject(value) && !isArray(value)) {
      return { value };
    }

    const { alreadyConvertedValuesCache, parent, container } = state;
    const alreadyExisted = alreadyConvertedValuesCache.get(value);

    if (
      !alreadyExisted || (
        !isSimpleNode(alreadyExisted) &&
        !isComplexNode(alreadyExisted)
      )
    ) {
      return { value };
    }

    if (!parent || !isSimpleNode(parent)) {
      return { value };
    }

    const nodeId = "#" + buildPointer(path);
    const nodeKey = resolveNodeKey(key, value);
    const cycledClone = tree.createCycledClone(alreadyExisted, nodeId, nodeKey, parent);
    if (container) {
      container.addNestedNode(cycledClone);
    } else if (parent) {
      parent.addChildNode(cycledClone);
    }
    return { done: true };
  };

  const unifyValueHook: SyncCrawlHook<S, R> = ({ key, value, path, state, rules }) => {
    if (!rules || !Array.isArray(rules.transformers)) {
      return;
    }

    const transformers = rules.transformers;
    const transformedValue = transformers.reduce(
      (accumulatedTransformedValue, transform) => transform(key, accumulatedTransformedValue, source, path, state),
      value
    );

    return { value: transformedValue };
  };

  const createNodesHook: SyncCrawlHook<S, R> = ({ key, value, path, rules, state }) => {
    if (!rules) {
      return { done: true };
    }
    if (typeof key === "symbol") {
      return { done: true };
    }
    if (isDisallowedValue(value)) {
      return { done: true };
    }
    if (!rules.kind || !supportedNodeKinds.includes(rules.kind)) {
      return;
    }

    const { parent, container } = state;
    const nodeId = "#" + buildPointer(path);
    const nodeKey = resolveNodeKey(key, value);
    const { kind, complex = false } = rules;

    const nodeParams = createNodeParams(value, parent, container);
    const treeNode = createNodeFromRaw(nodeId, nodeKey, kind, complex, nodeParams);
    if (!treeNode) {
      return;
    }

    if (container) {
      container.addNestedNode(treeNode);
    } else if (parent) {
      parent.addChildNode(treeNode);
    }

    // TODO 22.05.2026 // This is NOT shared logic! It's only diffs-related logic!
    // So, convert it to extension point!
    let nextCrawlValue: unknown = value;
    if (shouldStopAfterNodeCreation?.(treeNode, value)) {
      const descendantDiffs = parent
        ? (parent as unknown as ITreeNodeWithDiffs<V, K, M, N>).descendantDiffs
        : undefined;
      if (!descendantDiffs || !(key in descendantDiffs)) {
        return { done: true };
      }
      const descendantChangedPropertyMetadata = descendantDiffs[key];
      if (!descendantChangedPropertyMetadata) {
        return { done: true };
      }

      const { data } = descendantChangedPropertyMetadata;
      if (isDiffReplace(data)) {
        nextCrawlValue = data.beforeValue;
      }
    }
    // ---------------------------------------

    const newCache = new Map(state.alreadyConvertedValuesCache) as S["alreadyConvertedValuesCache"];
    if (isObject(value) || isArray(value)) {
      newCache.set(value, treeNode);
    }

    let newState: S;
    if (isSimpleNode(treeNode)) {
      newState = createStateForSimpleNode(state, treeNode, newCache);
    } else {
      newState = createStateForComplexNode(state, treeNode, newCache);
    }

    return { value: nextCrawlValue, state: newState };
  };

  return [
    preventInfiniteLoopHook,
    unifyValueHook,
    createNodesHook,
  ];
}
