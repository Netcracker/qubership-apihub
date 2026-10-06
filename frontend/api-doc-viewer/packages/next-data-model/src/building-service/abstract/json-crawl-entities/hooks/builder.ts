import { isDiffReplace } from "@netcracker/qubership-apihub-api-diff";
import { isArray, SyncCrawlHook } from "@netcracker/qubership-apihub-json-crawl";
import { ITreeNode } from "../../../../model/abstract/tree/tree-node.interface";
import { isObject } from "../../../../utilities";
import { NodeId, NodeKey } from "../../../../utility-types";
import { SchemaCrawlRule } from "../../../jso/json-crawl-entities/rules/types";
import {
  buildNodeId,
  LazyMaterializationState,
} from "../../tree/lazy-materialization";
import { CommonState } from "../state/types";
import { ITreeNodeWithDiffs } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";

function defaultIsDisallowedValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (!isObject(value) && !isArray(value))
  );
}

type CycleCloneFactory<
  V extends object | boolean | null,
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
  V extends object | boolean | null,
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
  R extends SchemaCrawlRule<K, S> = SchemaCrawlRule<K, S>,
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
    kind: K,
  ) => P
  createStateForSimpleNode: (
    state: S,
    node: N,
  ) => S
  createStateForComplexNode: (
    state: S,
    node: N,
  ) => S
  isSimpleNode: (node: N) => boolean
  isComplexNode: (node: N) => boolean
  resolveNodeKey: (key: NodeKey, value: unknown) => NodeKey
  isDisallowedValue?: (value: unknown) => boolean
  /** When true, descend into value without creating a tree node (legacy JSON Schema tuple `items`). */
  shouldSkipNodeCreation?: (value: unknown, rules: R) => boolean
  shouldStopAfterNodeCreation?: (node: N, value: unknown) => boolean
  /** Opt-in lazy materialization. */
  lazy?: {
    state: LazyMaterializationState<R>
    resolveHasOwnChildren: (value: unknown, rules: R | undefined) => boolean
  }
}

export function createTreeBuildingHooks<
  V extends object | boolean | null,
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
  params: TreeBuildingHooksFactoryParams<V, K, M, N, S, P, R>
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
    shouldSkipNodeCreation,
    shouldStopAfterNodeCreation,
    lazy,
  } = params;

  const preventInfiniteLoopHook: SyncCrawlHook<S, R> = ({ value, state, key, path }) => {
    if (typeof key === "symbol") {
      return;
    }
    if (!isObject(value) && !isArray(value)) {
      return { value };
    }

    const { ancestors, parent, container, pathPrefix = [] } = state;
    const alreadyExisted = ancestors.get(value);

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

    const nodeId = buildNodeId(pathPrefix, path);
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
    if (shouldSkipNodeCreation?.(value, rules)) {
      return;
    }
    if (!rules.kind || !supportedNodeKinds.includes(rules.kind)) {
      return;
    }

    const { parent, container, ancestors, pathPrefix = [], depth = 0, materializeDepth } = state;
    const nodeId = buildNodeId(pathPrefix, path);
    const nodeKey = resolveNodeKey(key, value);
    const { kind, complex = false } = rules;

    const nodeParams = createNodeParams(value, parent, container, kind);
    const treeNode = createNodeFromRaw(nodeId, nodeKey, kind, complex, nodeParams);
    if (!treeNode) {
      return;
    }

    if (container) {
      container.addNestedNode(treeNode);
    } else if (parent) {
      parent.addChildNode(treeNode);
    }

    if (lazy && (isObject(value) || isArray(value))) {
      lazy.state.rememberFragment(nodeId, value as object);
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

    const nextDepth = depth + (nodeParams.newDataLevel ? 1 : 0);
    const shouldDeferChildren = Boolean(
      lazy &&
      isSimpleNode(treeNode) &&
      materializeDepth !== undefined &&
      nextDepth >= materializeDepth &&
      (isObject(value) || isArray(value)) &&
      lazy.resolveHasOwnChildren(value, rules),
    );

    if (shouldDeferChildren) {
      lazy!.state.defer({
        nodeId,
        fragment: value as object,
        path: [...pathPrefix, ...path],
        rules,
      });
    }

    const shouldTrackAncestor = isObject(value) || isArray(value);
    if (shouldTrackAncestor) {
      ancestors.enter(value, treeNode);
    }

    let newState: S;
    if (isSimpleNode(treeNode)) {
      newState = createStateForSimpleNode(state, treeNode);
    } else {
      newState = createStateForComplexNode(state, treeNode);
    }
    // Keep depth / materializeDepth / pathPrefix on the crawl state for descendants.
    newState = {
      ...newState,
      depth: nextDepth,
      materializeDepth: state.materializeDepth,
      pathPrefix: state.pathPrefix,
    };

    if (shouldDeferChildren) {
      return {
        done: true,
        exitHook: shouldTrackAncestor
          ? () => { ancestors.leave(value) }
          : undefined,
      };
    }

    return {
      value: nextCrawlValue,
      state: newState,
      exitHook: shouldTrackAncestor
        ? () => { ancestors.leave(value) }
        : undefined,
    };
  };

  return [
    preventInfiniteLoopHook,
    unifyValueHook,
    createNodesHook,
  ];
}

